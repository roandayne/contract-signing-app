class Api::V1::FormsController < ApplicationController
    include ::AuthorizeApiRequest
    require 'combine_pdf'
    require 'tempfile'
    
    def create
        Rails.logger.debug "Params: #{params.inspect}"
        
        unless params[:files].present?
          return render json: { error: "Files are required" }, status: :unprocessable_entity
        end

        begin
          combined_pdf = CombinePDF.new

          params[:files].each do |uploaded_file|
            unless uploaded_file.content_type == "application/pdf"
              return render json: { error: "Only PDF files are allowed" }, status: :unprocessable_entity
            end
            
            pdf_content = CombinePDF.parse(uploaded_file.read)
            combined_pdf << pdf_content
          end

          temp_file = Tempfile.new(['combined', '.pdf'])
          combined_pdf.save(temp_file.path)

          form = Form.new
          form.user_id = current_user.id
          
          form.file_name = "combined_#{Time.current.strftime('%Y%m%d_%H%M%S')}.pdf"
          form.file_type = 'pdf'
          form.file_url = 'pending'
          
          form.file.attach(
            io: File.open(temp_file.path),
            filename: form.file_name,
            content_type: 'application/pdf'
          )
          
          unless form.file.attached?
            return render json: { error: "Failed to attach combined file" }, status: :unprocessable_entity
          end
          
          Rails.logger.debug "Form attributes before save: #{form.attributes.inspect}"

          if form.save
            # Now that we have saved the record, we can generate the permanent URL
            form.update(file_url: url_for(form.file))
            
            render json: {
              message: "PDFs combined and uploaded successfully",
              form: form,
              file_url: form.file_url
            }, status: :created
          else
            Rails.logger.error "Form save errors: #{form.errors.full_messages}"
            form.file.purge # Clean up the attached file if form save fails
            render json: { errors: form.errors.full_messages }, status: :unprocessable_entity
          end
        rescue => e
          Rails.logger.error "Error in form creation: #{e.message}"
          render json: { error: "Failed to process file upload: #{e.message}" }, status: :internal_server_error
        ensure
          # Clean up temporary file
          temp_file&.close
          temp_file&.unlink
        end
    end

    def show
      form = Form.find(params[:id])

      if form.file.attached?
        render json: {
          form: form,
          file_url: url_for(form.file)
        }
      else
        render json: { message: "No file attached" }
      end
    end

    private
      def form_params
        params.permit(files: [])
      end
end
