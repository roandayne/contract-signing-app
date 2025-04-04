class Api::V1::FormsController < ApplicationController
    include ::AuthorizeApiRequest
    require 'combine_pdf'
    require 'tempfile'
    
    before_action :set_form, only: [:show, :generate_link]
    skip_before_action :authorize_request, only: [:show]
    
    def signature_fields
      @form = current_user.forms.find(params[:uuid])
      @signatures = @form.signatures
      render json: @signatures
    end

    def index
      page = params[:page].presence || 1
      per_page = params[:per_page].presence || 10
    
      forms = current_user.forms
                          .includes(:signatures)
                          .order(updated_at: :desc)
                          .page(page)
                          .per(per_page)
    
      render json: {
        forms: forms.as_json(include: :signatures),
        pagination: {
          current_page: forms.current_page,
          total_pages: forms.total_pages,
          total_count: forms.total_count,
          per_page: forms.limit_value
        }
      }
    end    
    
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
            # Generate the URL based on the environment
            file_url = if Rails.env.development?
              Rails.application.routes.url_helpers.rails_blob_path(form.file, only_path: true)
            else
              url_for(form.file)
            end
            
            form.update(file_url: file_url)
            
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
      if @form.file.attached?
        file_url = if Rails.env.development?
          Rails.application.routes.url_helpers.rails_blob_path(@form.file, only_path: true)
        else
          url_for(@form.file)
        end

        render json: {
          form: @form,
          file_url: file_url,
          signature_fields: @form.signatures
        }
      else
        render json: { error: "No file attached" }, status: :not_found
      end
    end

    def generate_link
      if @form.signatures.empty?
        render json: { error: 'Form must have signature fields before generating a link' }, status: :unprocessable_entity
        return
      end

      # Generate signing link using UUID
      signing_link = "#{ENV['CLIENT_URL']}/sign/#{@form.uuid}"

      if @form.update(signing_link: signing_link)
        render json: { signing_link: signing_link }, status: :ok
      else
        render json: { error: 'Failed to generate signing link' }, status: :unprocessable_entity
      end
    end

    private
      def form_params
        params.permit(files: [])
      end

      def set_form
        @form = Form.find_by!(uuid: params[:uuid])
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'Form not found' }, status: :not_found
      end
end
