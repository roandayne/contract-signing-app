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
        
        # Create a hash to store forms for each page
        page_forms = {}
        first_signature_page = nil
        
        # Process signatures
        annotations['signatures']&.each do |sig|
          Rails.logger.debug "Processing signature with data: #{sig.inspect}"
          page_number = sig['page_number'].to_i
          Rails.logger.debug "Placing signature on page #{page_number}"
          
          # Keep track of the first signature's page
          first_signature_page ||= page_number if sig['signature_data'].present?
          
          # Ensure page exists
          if page_number >= doc.pages.count
            Rails.logger.error "Page #{page_number} does not exist in document with #{doc.pages.count} pages"
            next
          end
          
          page = doc.pages[page_number]
          
          # Get or create form for this page
          form = page_forms[page_number] ||= doc.add({Type: :XObject, Subtype: :Form, BBox: page.box(:crop)})
          canvas = form.canvas
          
          # Convert signature data URL to image and add to PDF
          if sig['signature_data'].present?
            # Remove data URL prefix to get base64 data
            base64_data = sig['signature_data'].sub(/\Adata:image\/[^;]+;base64,/, '')
            signature_image = StringIO.new(Base64.decode64(base64_data))
            
            # Add signature image to the form
            canvas.image(signature_image, 
              at: [sig['position_x'], page.box.height - sig['position_y'] - sig['height']], 
              width: sig['width'], 
              height: sig['height'])
          end
        end
        
        # Process text fields
        annotations['text_fields']&.each do |field|
          Rails.logger.debug "Processing text field with data: #{field.inspect}"
          page_number = field['page_number'].to_i
          Rails.logger.debug "Placing text field on page #{page_number}"
          
          # Ensure page exists
          if page_number >= doc.pages.count
            Rails.logger.error "Page #{page_number} does not exist in document with #{doc.pages.count} pages"
            next
          end
          
          page = doc.pages[page_number]
          
          # Get or create form for this page
          form = page_forms[page_number] ||= doc.add({Type: :XObject, Subtype: :Form, BBox: page.box(:crop)})
          canvas = form.canvas
          
          if field['value'].present?
            canvas.font('Helvetica', size: 12)
            canvas.text(field['value'], 
              at: [field['position_x'], page.box.height - field['position_y'] - 20])
          end
        end
        
        # Add metadata to the page with the first signature
        if first_signature_page && page_forms[first_signature_page]
          canvas = page_forms[first_signature_page].canvas
          canvas.font('Helvetica', size: 8)
          canvas.text("Signed by: #{signer_name}", at: [10, 10])
          canvas.text("Date: #{created_at.strftime('%Y-%m-%d %H:%M:%S')}", at: [10, 20])
        end
        
        # Apply all forms to their respective pages
        page_forms.each do |page_number, form|
          page = doc.pages[page_number]
          name = page.resources.add_xobject(form)
          page.contents = "#{page.contents} /#{name} Do"
        end
      end
      
      # Save the annotated PDF
      doc.write(temp_file.path)
      
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