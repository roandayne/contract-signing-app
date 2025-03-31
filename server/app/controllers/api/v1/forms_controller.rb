class Api::V1::FormsController < ApplicationController
    def create
        form = Form.new(form_params)

        if params[:file].present?
          form.file.attach(params[:file])
        end

        if form.save
          render json: {
            message: "Form uploaded successfully",
            form: form,
            file_url: form.file.attached? ? url_for(form.file) : nil
          }, status: :created
        else
          render json: { errors: form.errors.full_messages }, status: :unprocessable_entity
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
        params.require(:form).permit(:title, :description)
      end
end
