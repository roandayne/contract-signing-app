class Api::V1::SubmissionsController < ApplicationController
  include ::AuthorizeApiRequest
  include Rails.application.routes.url_helpers
  skip_before_action :authorize_request, only: [:index, :download_component]
  
  def index
    # Get all submissions with their forms and components
    submissions = Submission.includes(:form => :form_components)
                          .where.not(signer_name: nil)
                          .order(created_at: :desc)
    
    puts "Submissions count: #{submissions.length}"
    
    # Group submissions by form_id instead of form object
    grouped_submissions = submissions.group_by { |s| s.form_id }.map do |form_id, form_submissions|
      form = form_submissions.first.form
      puts "Processing form_id: #{form_id}"
      puts "Form found?: #{!form.nil?}"
      
      next unless form
      
      puts "Form components count: #{form.form_components.length}"
      
      {
        form: {
          uuid: form.uuid,
          file_name: form.file_name,
          # Include full form component details with page information
          form_components: form.form_components.map do |component|
            {
              id: component.id,
              original_filename: component.original_filename,
              page_count: component.page_count,
              start_page: component.start_page,
              end_page: component.end_page,
              order_index: component.order_index,
              # Add download URL for each component
              download_url: rails_storage_proxy_url(form.file)
            }
          end
        },
        submissions: form_submissions.map do |submission|
          {
            id: submission.id,
            signer_name: submission.signer_name,
            signer_email: submission.signer_email,
            signed_pdf_url: submission.signed_pdf.attached? ? rails_storage_proxy_url(submission.signed_pdf) : nil,
            signed_pdf_download_url: submission.signed_pdf.attached? ? rails_storage_proxy_url(submission.signed_pdf, disposition: 'attachment') : nil,
            created_at: submission.created_at,
            # Include annotations data which contains signature positions and page numbers
            annotations_data: submission.annotations_data
          }
        end
      }
    end.compact

    puts "Grouped submissions count: #{grouped_submissions.length}"
    
    render json: {
      grouped_submissions: grouped_submissions
    }
  end

  def download_component
    begin
      Rails.logger.info "Attempting to download component with form_uuid: #{params[:form_uuid]}, component_id: #{params[:id]}"
      
      form = Form.find_by!(uuid: params[:form_uuid])
      Rails.logger.info "Found form with UUID: #{form.uuid}"
      
      unless form.file.attached?
        Rails.logger.error "Form file is not attached"
        return render json: { error: "Form file is not available" }, status: :unprocessable_entity
      end
      
      component = form.form_components.find(params[:id])
      Rails.logger.info "Found component with ID: #{component.id}"
      
      start_page = params[:start_page].to_i
      end_page = params[:end_page].to_i
      Rails.logger.info "Extracting pages #{start_page} to #{end_page}"
      
      # Download the file content
      begin
        file_content = form.file.download
        Rails.logger.info "Successfully downloaded file content, size: #{file_content.size} bytes"
      rescue StandardError => e
        Rails.logger.error "Error downloading file: #{e.message}"
        return render json: { error: "Could not download file content" }, status: :unprocessable_entity
      end
      
      # Use combine_pdf to extract specific pages
      begin
        require 'combine_pdf'
        # Create a temporary file to handle the binary content properly
        require 'tempfile'
        temp_pdf = Tempfile.new(['temp_pdf', '.pdf'], binmode: true)
        begin
          temp_pdf.write(file_content)
          temp_pdf.rewind
          pdf = CombinePDF.load(temp_pdf.path)
          Rails.logger.info "Loaded PDF with #{pdf.pages.length} pages"
          
          if start_page > pdf.pages.length || end_page > pdf.pages.length
            Rails.logger.error "Invalid page range: start_page: #{start_page}, end_page: #{end_page}, total pages: #{pdf.pages.length}"
            return render json: { error: "Invalid page range requested" }, status: :unprocessable_entity
          end
          
          # Extract specified pages (CombinePDF uses 0-based indexing)
          selected_pages = pdf.pages[start_page - 1..end_page - 1]
          Rails.logger.info "Selected #{selected_pages.length} pages"
          
          if selected_pages.empty?
            Rails.logger.error "No pages were selected"
            return render json: { error: "No pages could be extracted" }, status: :unprocessable_entity
          end
          
          new_pdf = CombinePDF.new
          selected_pages.each { |page| new_pdf << page }
          
          # Generate the PDF data
          pdf_data = new_pdf.to_pdf
          Rails.logger.info "Generated new PDF with #{new_pdf.pages.length} pages"
          
          # Send the file with appropriate headers
          send_data pdf_data,
                    filename: component.original_filename,
                    type: 'application/pdf',
                    disposition: 'attachment'
        ensure
          # Make sure we clean up the temporary file
          temp_pdf.close
          temp_pdf.unlink
        end
      rescue StandardError => e
        Rails.logger.error "PDF processing error: #{e.message}\n#{e.backtrace.join("\n")}"
        render json: { error: "Failed to process PDF: #{e.message}" }, status: :internal_server_error
      end
    rescue ActiveRecord::RecordNotFound => e
      Rails.logger.error "Record not found: #{e.message}"
      render json: { error: "Resource not found" }, status: :not_found
    rescue StandardError => e
      Rails.logger.error "Error in download_component: #{e.message}\n#{e.backtrace.join("\n")}"
      render json: { error: "Failed to process PDF" }, status: :internal_server_error
    end
  end

  private

  def default_url_options
    { host: request.base_url }
  end
end 