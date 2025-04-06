class Api::V1::SignaturesController < ApplicationController
    include ::AuthorizeApiRequest
    include Rails.application.routes.url_helpers
    before_action :set_form
    skip_before_action :authorize_request, only: [:sign]

    # GET /forms/:uuid/signatures
    def index
      signatures = Signature.where(form_id: @form.id)
      render json: { signatures: signatures }
    end

    # DELETE /forms/:uuid/signatures/:id
    def destroy
      signature = Signature.find_by(id: params[:id], form_id: @form.id)
      
      if signature
        signature.destroy
        render json: { message: 'Signature field deleted successfully' }, status: :ok
      else
        render json: { error: 'Signature field not found' }, status: :not_found
      end
    end

    # POST /forms/:uuid/signatures
    def create
      # Log the incoming parameters for debugging
      Rails.logger.info "Received signature fields: #{signature_params_array.inspect}"

      begin
        # Delete existing signatures for this Form
        Signature.where(form_id: @form.id).destroy_all

        # Create new signatures from the params
        signatures = signature_params_array.map do |field|
          Signature.create!(
            form_id: @form.id,
            user_id: current_user.id,  # Assuming you have current_user method
            signature_type: field[:type],
            position_x: field[:x],
            position_y: field[:y],
            page_number: field[:pageNum],
            signature_data: nil  # This will be filled when user actually signs
          )
        end
        
        # Return the created signatures
        render json: {
          signatures: signatures,
          message: 'Signature fields created successfully'
        }, status: :ok
      rescue => e
        Rails.logger.error "Error creating signatures: #{e.message}"
        render json: {
          error: 'Failed to create signature fields',
          details: e.message
        }, status: :unprocessable_entity
      end
    end

    # PATCH /forms/:uuid/signatures/:id
    def update
      signature = Signature.find_by(id: params[:id], form_id: @form.id)
      
      if signature
        if signature.update(update_signature_params)
          render json: { signature: signature, message: 'Signature field updated successfully' }, status: :ok
        else
          render json: { error: 'Failed to update signature field', details: signature.errors.full_messages }, status: :unprocessable_entity
        end
      else
        render json: { error: 'Signature field not found' }, status: :not_found
      end
    end

    # POST /forms/:uuid/signatures/:id/sign
    def sign
      signature = Signature.find_by(id: params[:id], form_id: @form.id)
      
      if signature
        ActiveRecord::Base.transaction do
          Rails.logger.info "Received raw params: #{params.inspect}"
          
          # Initialize empty arrays for signatures and text fields
          signatures_data = []
          text_fields_data = []
          
          # Process signatures if present
          if sign_params[:signatures_attributes].present?
            sign_params[:signatures_attributes].each do |_key, sig|
              signature_hash = {
                "field_id" => sig[:field_id].to_s,
                "signature_data" => sig[:signature_data].to_s,
                "position_x" => sig[:position_x].to_f,
                "position_y" => sig[:position_y].to_f,
                "width" => sig[:width].to_f,
                "height" => sig[:height].to_f
              }
              signatures_data << signature_hash
              
              # Update the current signature if it matches
              if sig[:field_id].to_s == params[:id].to_s
                signature.update!(signature_data: sig[:signature_data])
                Rails.logger.info "Updated signature with data for field_id: #{sig[:field_id]}"
              end
            end
          end
          
          # Process text fields if present
          if sign_params[:text_fields_attributes].present?
            sign_params[:text_fields_attributes].each do |_key, field|
              field_hash = {
                "name" => field[:name].to_s,
                "value" => field[:value].to_s,
                "position_x" => field[:position_x].to_f,
                "position_y" => field[:position_y].to_f,
                "width" => field[:width].to_f,
                "height" => field[:height].to_f
              }
              text_fields_data << field_hash
            end
          end
          
          # Create the annotations data hash and serialize it
          annotations_data = {
            "signatures" => signatures_data,
            "text_fields" => text_fields_data
          }
          
          Rails.logger.info "Formatted annotations data: #{annotations_data.inspect}"
          
          submission = Submission.create!(
            form: @form,
            user: current_user, # Will be nil for non-authenticated users
            signer_name: sign_params[:signer_name],
            signer_email: sign_params[:signer_email],
            annotations_data: annotations_data,
            status: 'processing'
          )
          
          Rails.logger.info "Created submission with ID: #{submission.id}"
          
          # Attach the original PDF from the form and generate signed version
          if @form.file.attached?
            puts "Form file attached"
            # Attach the original PDF
            submission.signed_pdf.attach(@form.file.blob)
            puts "PDF attached"
            # Annotate the PDF
            submission.annotate_pdf
            puts "PDF annotated"
            # Generate and save the signed PDF URL using rails_blob_url
            signed_pdf_url = Rails.application.routes.url_helpers.rails_blob_url(
              submission.signed_pdf,
              host: ENV['HOST_URL'] || 'localhost:3000',
              protocol: ENV['HOST_PROTOCOL'] || 'http'
            )
            puts "Signed PDF URL generated"
            submission.update!(
              status: 'completed',
              signed_pdf_url: signed_pdf_url
            )
            puts "Submission updated"
            render json: {
              message: 'Document signed successfully',
              submission_id: submission.id,
              signed_pdf_url: signed_pdf_url
            }, status: :ok
          else
            submission.update!(status: 'failed')
            raise ActiveRecord::RecordInvalid.new(submission), "Form has no PDF attached"
          end
        end
      else
        render json: { error: 'Signature field not found' }, status: :not_found
      end
    rescue => e
      Rails.logger.error "Error processing signature: #{e.message}"
      Rails.logger.error e.backtrace.join("\n")
      render json: {
        error: 'Failed to process signature',
        details: e.message
      }, status: :unprocessable_entity
    end

    private

    def set_form
      @form = Form.find_by!(uuid: params[:form_uuid])
    rescue ActiveRecord::RecordNotFound
      render json: { error: 'Form not found' }, status: :not_found
    end

    def signature_params_array
      # This expects an array of signature fields in the request body
      params.require(:signature_fields).map do |field|
        field.permit(:type, :x, :y, :pageNum).tap do |permitted_field|
          # Convert frontend field type to backend signature_type if needed
          case permitted_field[:type]
          when 'signature'
            permitted_field[:type] = 'draw'
          when 'initial'
            permitted_field[:type] = 'initial'
          when 'name'
            permitted_field[:type] = 'type'
          when 'date'
            permitted_field[:type] = 'date'
          end
        end
      end
    end

    def update_signature_params
      params.require(:signature).permit(:position_x, :position_y, :page_number)
    end

    def sign_params
      params.require(:signature).permit(
        :signer_name,
        :signer_email,
        signatures_attributes: [:field_id, :signature_data, :position_x, :position_y, :width, :height],
        text_fields_attributes: [:name, :value, :position_x, :position_y, :width, :height]
      )
    end
end
