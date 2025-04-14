class Form < ApplicationRecord
    has_one_attached :file
    has_many :signatures, dependent: :destroy
    has_many :form_components, -> { order(order_index: :asc) }, dependent: :destroy
    has_many :submissions, dependent: :destroy
    belongs_to :user
    
    def extract_component_pdf(start_page, end_page)
      return nil unless file.attached?
      
      require 'combine_pdf'
      require 'tempfile'
      
      temp_file = Tempfile.new(['component', '.pdf'])
      downloaded_file = nil
      
      begin
        # Download the file to a temporary location
        downloaded_file = Tempfile.new(['original', '.pdf'])
        downloaded_file.binmode
        downloaded_file.write(file.download)
        downloaded_file.rewind
        
        # Load the PDF using the downloaded file
        pdf = CombinePDF.load(downloaded_file.path)
        component_pdf = CombinePDF.new
        
        Rails.logger.info "Extracting pages #{start_page} to #{end_page} from PDF with #{pdf.pages.length} pages"
        
        # Validate page numbers
        if start_page > pdf.pages.length || end_page > pdf.pages.length
          Rails.logger.error "Invalid page range: #{start_page}-#{end_page} for PDF with #{pdf.pages.length} pages"
          return nil
        end
        
        # Convert from 1-based to 0-based indexing for PDF pages
        ((start_page - 1)..(end_page - 1)).each do |i|
          if pdf.pages[i]
            component_pdf << pdf.pages[i]
          else
            Rails.logger.error "Page #{i + 1} not found in PDF"
          end
        end
        
        # Save the component PDF
        temp_file.binmode
        component_pdf.save(temp_file.path)
        
        # Verify the output file
        if File.size(temp_file.path) > 0
          temp_file
        else
          Rails.logger.error "Generated component PDF is empty"
          temp_file.close
          temp_file.unlink
          nil
        end
      rescue => e
        Rails.logger.error "Error extracting component PDF: #{e.message}"
        Rails.logger.error e.backtrace.join("\n")
        temp_file.close
        temp_file.unlink
        nil
      ensure
        downloaded_file&.close
        downloaded_file&.unlink
      end
    end
end
