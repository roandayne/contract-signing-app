class Api::V1::SignaturesController < ApplicationController
    include ::AuthorizeApiRequest
    before_action :set_form

    # GET /forms/:form_id/signatures
    def index
      signatures = Signature.where(form_id: @form.id)
      render json: { signatures: signatures }
    end

    # DELETE /forms/:form_id/signatures/:id
    def destroy
      signature = Signature.find_by(id: params[:id], form_id: @form.id)
      
      if signature
        signature.destroy
        render json: { message: 'Signature field deleted successfully' }, status: :ok
      else
        render json: { error: 'Signature field not found' }, status: :not_found
      end
    end

    # POST /forms/:form_id/signatures
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

    # PATCH /forms/:form_id/signatures/:id
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

    private

    def set_form
      @form = Form.find(params[:form_id])
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
end
