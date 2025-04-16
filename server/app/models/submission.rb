class Submission < ApplicationRecord
  belongs_to :user, optional: true
  belongs_to :form
  
  has_one_attached :signed_pdf
  
  validates :signer_name, presence: true
  validates :signer_email, uniqueness: { scope: :form_id }, allow_nil: true
  validates :status, inclusion: { in: ['completed', 'failed', 'processing'] }

  def annotate_pdf
    require 'hexapdf'
    require 'base64'
    require 'tempfile'

    pdf_path = ActiveStorage::Blob.service.path_for(signed_pdf.key)
    document = HexaPDF::Document.open(pdf_path)

    annotations = nil

    puts "Annotation Data: #{annotations_data.inspect}"
    if annotations_data.is_a?(String) && annotations_data.start_with?('{')
      # Convert Ruby hash syntax to JSON if needed
      if annotations_data.include?('=>')
        puts "Annotations Data is a string and starts with { and includes =>"
        # Replace Ruby hash rocket with JSON colon
        json_string = annotations_data.gsub('=>', ':')
        puts "JSON String: #{json_string.inspect}"
        annotations = JSON.parse(json_string)
      else
        puts "Annotations Data is a string and starts with { and does not include =>"
        annotations = JSON.parse(annotations_data)
      end
    # Then, try handling as Ruby hash
    elsif annotations_data.is_a?(Hash)
      puts "Annotations Data is a hash"
      annotations = annotations_data
    # Try evaluating as Ruby code if it's a string but not JSON
    elsif annotations_data.is_a?(String)
      puts "Annotations Data is a string and is not a hash or JSON"
      data = eval(annotations_data) rescue nil
      annotations = data.is_a?(Hash) ? data : nil
    end

    puts "Annotations: #{annotations.inspect}"

    signatures = annotations['signatures']

    signatures.each do |signature|
      puts "Signature: #{signature.inspect}"
      page = document.pages[signature['page_number'] - 1]
      puts "Page: #{page.inspect}"

      regex = /^data:image\/png;base64,(.*)/
      if signature['signature_data'].match?(regex)
        base64_data = signature['signature_data'].match(regex)[1]
        decoded_data = Base64.decode64(base64_data)

        tempfile = Tempfile.new(['signature', '.png'], binmode: true)
        tempfile.write(decoded_data)
        tempfile.rewind

        image = document.images.add(tempfile)
        # xobject = document.add(image.to_xobject)
        # page.canvas.image(image, at: [signature['position_x'], page.box(:media).height - signature['position_y'] - signature['height']], width: signature['width'], height: signature['height'])
        canvas = page.canvas(type: :overlay)
        canvas.image(image, at: [signature['position_x'], page.box(:media).height - signature['position_y'] - signature['height']], width: signature['width'], height: signature['height'])
        tempfile.close
        tempfile.unlink
      end
    end

    # Create a new tempfile for the output PDF
    output_pdf = Tempfile.new(['output', '.pdf'])
    document.write(output_pdf.path, optimize: true)
    signed_pdf.attach(
      io: File.open(output_pdf.path),
      filename: "signed_#{signed_pdf.filename}",
      content_type: 'application/pdf'
    )
    output_pdf.close
    output_pdf.unlink

    puts "PDF annotated and saved successfully"
  end
end 