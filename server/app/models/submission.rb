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
        begin
          # Convert Ruby hash string to actual hash
          data = eval(annotations_data) rescue annotations_data
          # Convert hash to JSON string
          json_data = data.is_a?(String) ? data : data.to_json
          annotations = JSON.parse(json_data)
        rescue => e
          Rails.logger.error "JSON parsing failed: #{e.message}"
          Rails.logger.error "Raw annotations data: #{annotations_data}"
          raise
        end
        
        first_signature_page = nil
        
        # Process signatures
        annotations['signatures']&.each do |sig|
          Rails.logger.debug "Processing signature with data: #{sig.inspect}"
          page_number = sig['page_number'].to_i - 1  # Convert to 0-based index
          Rails.logger.debug "Placing signature on page #{page_number}"
          
          # Keep track of the first signature's page
          first_signature_page ||= page_number if sig['signature_data'].present?
          
          # Ensure page exists
          if page_number >= doc.pages.count
            Rails.logger.error "Page #{page_number} does not exist in document with #{doc.pages.count} pages"
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
          end
        end
        
        # Process type fields
        annotations['type_fields']&.each do |field|
          Rails.logger.debug "Processing type field with data: #{field.inspect}"
          page_number = field['page_number'].to_i - 1  # Convert to 0-based index
          Rails.logger.debug "Placing type field on page #{page_number}"
          
          # Ensure page exists
          if page_number >= doc.pages.count
            Rails.logger.error "Page #{page_number} does not exist in document with #{doc.pages.count} pages"
            next
          end
          
          page = doc.pages[page_number]
          
          if field['value'].present?
            # Get the current content stream
            contents = page.contents
            
            # Create text content
            text_y = page.box(:media).height - field['position_y'] - 12
            new_content = "q\nBT\n/Helvetica 12 Tf\n0 0 0 rg\n#{field['position_x']} #{text_y} Td\n(#{field['value']}) Tj\nET\nQ\n"
            
            # Combine the content streams
            page.contents = contents ? "#{contents}\n#{new_content}" : new_content
          end
        end
        
        # Add metadata to the page with the first signature
        if first_signature_page
          page = doc.pages[first_signature_page]
          
          # Get the current content stream
          contents = page.contents
          
          # Create metadata content
          metadata_y = 20
          new_content = "q\nBT\n/Helvetica 8 Tf\n0 0 0 rg\n" +
            "10 #{metadata_y} Td\n(Signed by: #{signer_name}) Tj\n" +
            "0 10 Td\n(Date: #{created_at.strftime('%Y-%m-%d %H:%M:%S')}) Tj\n" +
            "ET\nQ\n"
          
          # Combine the content streams
          page.contents = contents ? "#{contents}\n#{new_content}" : new_content
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