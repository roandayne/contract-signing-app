class Submission < ApplicationRecord
  belongs_to :user, optional: true
  belongs_to :form
  
  has_one_attached :signed_pdf
  
  validates :signer_name, presence: true
  validates :signer_email, uniqueness: { scope: :form_id }, allow_nil: true
  validates :status, inclusion: { in: ['completed', 'failed', 'processing'] }
  
  def annotate_pdf
    return unless signed_pdf.attached?
    
    require 'hexapdf'
    require 'json'
    
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
            sig['page_number'] = sig['page_number'].to_i
            Rails.logger.debug "Signature #{idx+1} - page_number: #{sig['page_number']}"
          end
          
          annotations['type_fields']&.each_with_index do |field, idx|
            field['page_number'] = field['page_number'].to_i
            Rails.logger.debug "Type field #{idx+1} - page_number: #{field['page_number']}"
          end
          
        rescue => e
          Rails.logger.error "JSON parsing failed: #{e.message}"
          Rails.logger.error "Raw annotations data: #{annotations_data}"
          raise
        end
        
        # Process signatures
        annotations['signatures']&.each do |sig|
          Rails.logger.debug "Processing signature with data: #{sig.inspect}"
          
          # Convert page number to 0-based index (PDF pages are 0-based)
          page_number = sig['page_number'].to_i - 1
          
          Rails.logger.debug "Placing signature on page #{page_number+1} (0-indexed: #{page_number})"
          
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
          
          # Convert page number to 0-based index (PDF pages are 0-based)
          page_number = field['page_number'].to_i - 1
          
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

  def annotate_pdf1
    require 'hexapdf'
    require 'json'
    require 'base64'
    require 'tempfile'
  
    begin
      # Debug: Print raw input data
      puts "Raw annotations data received:"
      puts annotations_data.inspect
  
      # Parse the input data
      parsed_data = case annotations_data
                   when String
                     if annotations_data.include?('=>')
                       # Convert Ruby hash string to JSON format
                       cleaned_string = annotations_data.gsub(/=>/, ':').gsub(/\bnil\b/, 'null')
                       JSON.parse(cleaned_string)
                     else
                       JSON.parse(annotations_data)
                     end
                   when Hash
                     annotations_data
                   else
                     raise "Unexpected annotations_data format: #{annotations_data.class}"
                   end
  
      # Debug: Print parsed data
      puts "Parsed data structure:"
      puts parsed_data.inspect
  
      # Extract signatures
      signatures = parse_signature_data(parsed_data)
      puts "Extracted #{signatures.size} signatures to process"
  
      # Open the PDF document
      pdf_path = ActiveStorage::Blob.service.path_for(signed_pdf.key)
      document = HexaPDF::Document.open(pdf_path)
  
      # Create temp file for output
      temp_file = Tempfile.new(['annotated', '.pdf'], binmode: true)
      puts "Temp file created: #{temp_file.path}"
      # Process each signature
      signatures.each_with_index do |signature, index|
        begin
          puts "\nProcessing signature #{index + 1}:"
          puts signature.inspect
  
          page_number = signature[:page_number].to_i
          puts "Target page: #{page_number}"
  
          # Validate page number
          if page_number < 1 || page_number > document.pages.count
            puts "Skipping - Invalid page number (document has #{document.pages.count} pages)"
            next
          end
  
          page = document.pages[page_number - 1]
          media_box = page.box(:media)
          puts "Page size: #{media_box.width} x #{media_box.height}"
  
          # Verify and process image data
          unless signature[:signature_data]&.start_with?('data:image')
            puts "Skipping - Invalid image data format"
            next
          end
  
          image_data = signature[:signature_data].split(',', 2).last
          decoded_data = Base64.decode64(image_data)
          puts "Image data size: #{decoded_data.size} bytes"
  
          image = document.images.add(StringIO.new(decoded_data))
          image_xobject = document.add(image.to_xobject)
          puts "Image successfully added to PDF"
  
          # Calculate annotation position (PDF coordinates start at bottom-left)
          x = signature[:position_x].to_f
          y = media_box.height - signature[:position_y].to_f - signature[:height].to_f
          width = signature[:width].to_f
          height = signature[:height].to_f
  
          rect = [x, y, x + width, y + height]
          puts "Annotation rectangle: #{rect.inspect}"
  
          # Create annotation
          annotation = page.add_annotation(
            :Stamp,
            rect: rect,
            contents: "Signature for #{signature[:signer_name]}",
            name: "Signature#{signature[:field_id]}",
            flags: [:print]
          )
  
          # Create appearance stream
          form = document.add({
            Type: :XObject,
            Subtype: :Form,
            BBox: [0, 0, width, height]
          })
          form.canvas.image(image_xobject, at: [0, 0], width: width, height: height)
          annotation.appearance = { N: form }
  
          puts "Successfully added signature to page #{page_number}"
        rescue => e
          puts "Error processing signature #{index + 1}: #{e.message}"
          puts e.backtrace.join("\n")
          next
        end
      end
  
      # Save the document
      document.write(temp_file.path, optimize: true)
      puts "\nPDF successfully annotated and saved to #{temp_file.path}"
  
      # Verify the output file
      if File.size(temp_file.path) > 0
        temp_file.rewind
        temp_file
      else
        puts "Error: Output file is empty"
        temp_file.close!
        nil
      end
  
    rescue => e
      puts "Fatal error in annotate_pdf: #{e.message}"
      puts e.backtrace.join("\n")
      temp_file&.close!
      raise
    end
  end
  
  def parse_signature_data(data)
    puts "\nParsing signature data..."
    
    # Initialize result array
    signatures = []
  
    # Extract signer info (handle both hash and string key formats)
    signer_name = data.dig('signature', 'signer_name') || 
                  data['signature[signer_name]'] || 
                  data.dig(:signature, :signer_name) || 
                  data[:'signature[signer_name]']
  
    signer_email = data.dig('signature', 'signer_email') || 
                   data['signature[signer_email]'] || 
                   data.dig(:signature, :signer_email) || 
                   data[:'signature[signer_email]']
  
    puts "Signer: #{signer_name} <#{signer_email}>"
  
    # Handle different data structures
    if data.dig('signature', 'signatures_attributes')
      # Nested hash structure
      signature_attrs = data['signature']['signatures_attributes']
      signature_attrs.each_with_index do |(_, attrs), index|
        signatures << build_signature_hash(attrs, index, signer_name, signer_email)
      end
    elsif data.keys.any? { |k| k.to_s.start_with?('signature[signatures_attributes]') }
      # Flat structure with string keys
      data.each do |key, value|
        if key.to_s.start_with?('signature[signatures_attributes]')
          parts = key.to_s.split(/[\[\]]/).reject(&:empty?)
          index = parts[2].to_i
          field = parts[3]
          
          signatures[index] ||= { 
            signer_name: signer_name, 
            signer_email: signer_email,
            field_id: index.to_s
          }
          signatures[index][field.to_sym] = value
        end
      end
    else
      puts "Unrecognized signature data structure"
    end
  
    # Compact and filter out nil entries
    signatures = signatures.compact.select { |s| s[:signature_data].present? }
    puts "Found #{signatures.size} valid signatures"
    signatures
  end
  
  def build_signature_hash(attrs, index, signer_name, signer_email)
    {
      signer_name: signer_name,
      signer_email: signer_email,
      field_id: attrs['field_id'] || attrs[:field_id] || index.to_s,
      signature_data: attrs['signature_data'] || attrs[:signature_data],
      position_x: attrs['position_x'] || attrs[:position_x] || 0,
      position_y: attrs['position_y'] || attrs[:position_y] || 0,
      width: attrs['width'] || attrs[:width] || 100,
      height: attrs['height'] || attrs[:height] || 50,
      page_number: attrs['page_number'] || attrs[:page_number] || 1
    }.compact
  end
end 