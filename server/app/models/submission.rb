class Submission < ApplicationRecord
  belongs_to :form
  belongs_to :user, optional: true
  
  has_one_attached :signed_pdf
  
  validates :signer_name, presence: true
  validates :signer_email, uniqueness: { scope: :form_id }, allow_nil: true
  validates :status, inclusion: { in: ['completed', 'failed', 'processing'] }
  
  def annotate_pdf
    return unless signed_pdf.attached?
    
    require 'hexapdf'
    
    # Create a temporary file to store the annotated PDF
    temp_file = Tempfile.new(['annotated', '.pdf'])
    
    begin
      # Download the original PDF to a temporary file
      pdf_path = ActiveStorage::Blob.service.path_for(signed_pdf.key)
      
      # Create a new PDF document
      doc = HexaPDF::Document.open(pdf_path)
      
      # Parse and apply annotations
      if annotations_data.present?
        Rails.logger.debug "Annotations data before parsing: #{annotations_data.inspect}"
        
        # We'll handle the parsing differently to ensure page numbers are correctly processed
        annotations = nil
        
        begin
          # First, try parsing as a JSON string
          if annotations_data.is_a?(String) && annotations_data.start_with?('{')
            # Convert Ruby hash syntax to JSON if needed
            if annotations_data.include?('=>')
              # Replace Ruby hash rocket with JSON colon
              json_string = annotations_data.gsub('=>', ':')
              annotations = JSON.parse(json_string)
            else
              annotations = JSON.parse(annotations_data)
            end
          # Then, try handling as Ruby hash
          elsif annotations_data.is_a?(Hash)
            annotations = annotations_data
          # Try evaluating as Ruby code if it's a string but not JSON
          elsif annotations_data.is_a?(String)
            data = eval(annotations_data) rescue nil
            annotations = data.is_a?(Hash) ? data : nil
          end
          
          # If all parsing attempts failed, try one last approach
          if annotations.nil?
            json_data = annotations_data.is_a?(String) ? annotations_data : annotations_data.to_json
            annotations = JSON.parse(json_data)
          end
          
          # Debug all annotations to check page numbers
          Rails.logger.debug "Total signature annotations: #{annotations['signatures']&.size || 0}"
          Rails.logger.debug "Total type field annotations: #{annotations['type_fields']&.size || 0}"
          
          # Debug each annotation's page number
          annotations['signatures']&.each_with_index do |sig, idx|
            sig['page_number'] = sig['page_number'].to_i if sig['page_number'].present?
            Rails.logger.debug "Signature #{idx+1} - page_number: #{sig['page_number']}"
          end
          
          annotations['type_fields']&.each_with_index do |field, idx|
            field['page_number'] = field['page_number'].to_i if field['page_number'].present?
            Rails.logger.debug "Type field #{idx+1} - page_number: #{field['page_number']}"
          end
          
        rescue => e
          Rails.logger.error "JSON parsing failed: #{e.message}"
          Rails.logger.error "Raw annotations data: #{annotations_data}"
          raise
        end
        
        first_signature_page = nil
        
        # Process signatures
        annotations['signatures']&.each do |sig|
          Rails.logger.debug "Processing signature with data: #{sig.inspect}"
          
          # Safely convert page number to 0-based index, with 0 as default if missing/invalid
          raw_page_number = sig['page_number']
          Rails.logger.debug "Raw page number from signature: #{raw_page_number.inspect}"
          
          # Ensure we have a valid page number, default to first page (0) if invalid
          page_number = raw_page_number.present? && raw_page_number.to_i > 0 ? raw_page_number.to_i - 1 : 0
          
          Rails.logger.debug "Placing signature on page #{page_number+1} (0-indexed: #{page_number})"
          
          # Keep track of the first signature's page (but don't override if already set)
          first_signature_page ||= page_number if sig['signature_data'].present?
          
          # Ensure page exists
          if page_number >= doc.pages.count
            Rails.logger.error "Page #{page_number+1} does not exist in document with #{doc.pages.count} pages"
            next
          end
          
          page = doc.pages[page_number]
          
          # Convert signature data URL to image and add to PDF
          if sig['signature_data'].present?
            # Remove data URL prefix to get base64 data
            base64_data = sig['signature_data'].sub(/\Adata:image\/[^;]+;base64,/, '')
            signature_image = StringIO.new(Base64.decode64(base64_data))
            
            # Create a form XObject for the signature
            form = doc.add({Type: :XObject, Subtype: :Form, BBox: [0, 0, sig['width'], sig['height']]})
            form.canvas.image(signature_image, at: [0, 0], width: sig['width'], height: sig['height'])
            
            # Get the current content stream
            contents = page.contents
            
            # Create a new content stream that includes the form
            name = page.resources.add_xobject(form)
            new_content = "q\n1 0 0 1 #{sig['position_x']} #{page.box(:media).height - sig['position_y'] - sig['height']} cm\n/#{name} Do\nQ\n"
            
            # Combine the content streams
            page.contents = contents ? "#{contents}\n#{new_content}" : new_content
            
            # Add page number below the signature
            display_page_number = page_number + 1
            page_number_text = "Page #{display_page_number}"
            text_y = page.box(:media).height - sig['position_y'] - sig['height'] - 10
            page_number_content = "q\nBT\n/Helvetica 8 Tf\n0 0 0 rg\n#{sig['position_x']} #{text_y} Td\n(#{page_number_text}) Tj\nET\nQ\n"
            
            # Combine with existing content
            page.contents = "#{page.contents}\n#{page_number_content}"
            
            # Add metadata to this page with the signature
            metadata_y = 20
            metadata_content = "q\nBT\n/Helvetica 8 Tf\n0 0 0 rg\n" +
              "10 #{metadata_y} Td\n(Signed by: #{signer_name}) Tj\n" +
              "0 10 Td\n(Date: #{created_at.strftime('%Y-%m-%d %H:%M:%S')}) Tj\n" +
              "ET\nQ\n"
            
            # Combine with existing content
            page.contents = "#{page.contents}\n#{metadata_content}"
          end
        end
        
        # Process type fields
        annotations['type_fields']&.each do |field|
          Rails.logger.debug "Processing type field with data: #{field.inspect}"
          
          # Safely convert page number to 0-based index, with 0 as default if missing/invalid
          raw_page_number = field['page_number']
          Rails.logger.debug "Raw page number from type field: #{raw_page_number.inspect}"
          
          # Ensure we have a valid page number, default to first page (0) if invalid
          page_number = raw_page_number.present? && raw_page_number.to_i > 0 ? raw_page_number.to_i - 1 : 0
          
          Rails.logger.debug "Placing type field on page #{page_number+1} (0-indexed: #{page_number})"
          
          # Ensure page exists
          if page_number >= doc.pages.count
            Rails.logger.error "Page #{page_number+1} does not exist in document with #{doc.pages.count} pages"
            next
          end
          
          # Get the page object for this field
          page = doc.pages[page_number]
          
          if field['value'].present?
            # Get the current content stream - don't create new one if nil
            contents = page.contents || ""
            
            # Create text content
            text_y = page.box(:media).height - field['position_y'] - 12
            new_content = "q\nBT\n/Helvetica 12 Tf\n0 0 0 rg\n#{field['position_x']} #{text_y} Td\n(#{field['value']}) Tj\nET\nQ\n"
            
            # Combine the content streams (don't use ternary for safety)
            page.contents = contents + "\n" + new_content
            
            # Add metadata to this page with the field
            metadata_y = 20
            metadata_content = "q\nBT\n/Helvetica 8 Tf\n0 0 0 rg\n" +
              "10 #{metadata_y} Td\n(Signed by: #{signer_name}) Tj\n" +
              "0 10 Td\n(Date: #{created_at.strftime('%Y-%m-%d %H:%M:%S')}) Tj\n" +
              "ET\nQ\n"
            
            # Combine with existing content
            page.contents = "#{page.contents}\n#{metadata_content}"
          end
        end
      end
      
      # Save the annotated PDF
      doc.write(temp_file.path, optimize: true)
      
      # Attach the annotated PDF back to the record
      signed_pdf.attach(
        io: File.open(temp_file.path),
        filename: "signed_#{signed_pdf.filename}",
        content_type: 'application/pdf'
      )
    ensure
      temp_file.close
      temp_file.unlink
    end
  end
end 