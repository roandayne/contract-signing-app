class Api::V1::SubmissionsController < ApplicationController
  include ::AuthorizeApiRequest
  include Rails.application.routes.url_helpers
  skip_before_action :authorize_request, only: [:index, :download_component, :download_all_components]
  
  def index
    submissions = Submission.includes(:form => :form_components)
                          .where.not(signer_name: nil)
                          .order(created_at: :desc)
    
    puts "Submissions count: #{submissions.length}"
    
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
          form_components: form.form_components.map do |component|
            {
              id: component.id,
              original_filename: component.original_filename,
              page_count: component.page_count,
              start_page: component.start_page,
              end_page: component.end_page,
              order_index: component.order_index
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
      Rails.logger.info "Attempting to download component with form_uuid: #{params[:form_uuid]}, submission_id: #{params[:submission_id]}, component_id: #{params[:id]}"
      
      form = Form.find_by!(uuid: params[:form_uuid])
      Rails.logger.info "Found form with UUID: #{form.uuid}"
      
      submission = Submission.find(params[:submission_id])
      Rails.logger.info "Found submission with ID: #{submission.id}"
      
      unless submission.form_id == form.id
        Rails.logger.error "Submission does not belong to the specified form"
        return render json: { error: "Invalid submission for this form" }, status: :unprocessable_entity
      end
      
      unless submission.signed_pdf.attached?
        Rails.logger.error "Signed PDF is not attached"
        return render json: { error: "Signed PDF is not available" }, status: :unprocessable_entity
      end
      
      component = form.form_components.find(params[:id])
      Rails.logger.info "Found component with ID: #{component.id}"
      
      start_page = params[:start_page].to_i
      end_page = params[:end_page].to_i
      Rails.logger.info "Extracting pages #{start_page} to #{end_page}"
      
      begin
        file_content = submission.signed_pdf.download
        Rails.logger.info "Successfully downloaded file content, size: #{file_content.size} bytes"
      rescue StandardError => e
        Rails.logger.error "Error downloading file: #{e.message}"
        return render json: { error: "Could not download file content" }, status: :unprocessable_entity
      end
      
      begin
        require 'combine_pdf'
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
          
          selected_pages = pdf.pages[start_page - 1..end_page - 1]
          Rails.logger.info "Selected #{selected_pages.length} pages"
          
          if selected_pages.empty?
            Rails.logger.error "No pages were selected"
            return render json: { error: "No pages could be extracted" }, status: :unprocessable_entity
          end
          
          new_pdf = CombinePDF.new
          selected_pages.each { |page| new_pdf << page }
          
          pdf_data = new_pdf.to_pdf
          Rails.logger.info "Generated new PDF with #{new_pdf.pages.length} pages"
          
          send_data pdf_data,
                    filename: component.original_filename,
                    type: 'application/pdf',
                    disposition: 'attachment'
        ensure
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

  def download_all_components
    begin
      Rails.logger.info "Attempting to download all components for form_uuid: #{params[:form_uuid]}, submission_id: #{params[:submission_id]}"
      
      form = Form.find_by!(uuid: params[:form_uuid])
      Rails.logger.info "Found form with UUID: #{form.uuid}"
      
      submission = Submission.find(params[:submission_id])
      Rails.logger.info "Found submission with ID: #{submission.id}"
      
      unless submission.form_id == form.id
        Rails.logger.error "Submission does not belong to the specified form"
        return render json: { error: "Invalid submission for this form" }, status: :unprocessable_entity
      end
      
      unless submission.signed_pdf.attached?
        Rails.logger.error "Signed PDF is not attached"
        return render json: { error: "Signed PDF is not available" }, status: :unprocessable_entity
      end
      
      begin
        file_content = submission.signed_pdf.download
        Rails.logger.info "Successfully downloaded file content, size: #{file_content.size} bytes"
      rescue StandardError => e
        Rails.logger.error "Error downloading file: #{e.message}"
        return render json: { error: "Could not download file content" }, status: :unprocessable_entity
      end
      
      require 'tmpdir'
      Dir.mktmpdir do |temp_dir|
        require 'tempfile'
        temp_pdf = Tempfile.new(['temp_pdf', '.pdf'], binmode: true)
        begin
          temp_pdf.write(file_content)
          temp_pdf.rewind
          pdf = CombinePDF.load(temp_pdf.path)
          Rails.logger.info "Loaded PDF with #{pdf.pages.length} pages"
          
          require 'zip'
          zip_file_path = File.join(temp_dir, "#{form.file_name}_components.zip")
          
          Zip::File.open(zip_file_path, Zip::File::CREATE) do |zipfile|
            form.form_components.each do |component|
              Rails.logger.info "Processing component #{component.id}: pages #{component.start_page} to #{component.end_page}"
              
              selected_pages = pdf.pages[component.start_page - 1..component.end_page - 1]
              
              new_pdf = CombinePDF.new
              selected_pages.each { |page| new_pdf << page }
              
              component_pdf_path = File.join(temp_dir, "signed_#{component.original_filename}")
              File.binwrite(component_pdf_path, new_pdf.to_pdf)
              
              zipfile.add("signed_#{component.original_filename}", component_pdf_path)
            end
          end
          
          zip_data = File.binread(zip_file_path)
          send_data zip_data,
                    filename: "signed_#{form.file_name}_components.zip",
                    type: 'application/zip',
                    disposition: 'attachment'
                    
        ensure
          temp_pdf.close
          temp_pdf.unlink
        end
      end
    rescue ActiveRecord::RecordNotFound => e
      Rails.logger.error "Record not found: #{e.message}"
      render json: { error: "Resource not found" }, status: :not_found
    rescue StandardError => e
      Rails.logger.error "Error in download_all_components: #{e.message}\n#{e.backtrace.join("\n")}"
      render json: { error: "Failed to process PDFs" }, status: :internal_server_error
    end
  end

  private

  def default_url_options
    { host: request.base_url }
  end
end 