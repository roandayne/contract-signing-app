module Api::V1
  class UsersController < ApplicationController
    include ::AuthorizeApiRequest
    protect_from_forgery with: :null_session
    skip_before_action :verify_authenticity_token
    skip_before_action :authorize_request, only: [:login, :register, :validate_email]
    before_action :set_api_v1_user, only: %i[ show edit update destroy ]

    # GET /api/v1/users or /api/v1/users.json
    def index
      @users = User.all
      render json: { users: @users }, status: :ok
    end

    # GET /api/v1/users/1 or /api/v1/users/1.json
    def show
    end

    # GET /api/v1/users/new
    def new
      @user = User.new
    end

    # GET /api/v1/users/1/edit
    def edit
    end

    # POST /api/v1/users or /api/v1/users.json
    def create
      @user = User.new(user_params)

      respond_to do |format|
        if @user.save
          format.html { redirect_to @user, notice: "User was successfully created." }
          format.json { render :show, status: :created, location: @user }
        else
          format.html { render :new, status: :unprocessable_entity }
          format.json { render json: @user.errors, status: :unprocessable_entity }
        end
      end
    end

    # PATCH/PUT /api/v1/users/1 or /api/v1/users/1.json
    def update
      respond_to do |format|
        if @user.update(user_params)
          format.html { redirect_to @user, notice: "User was successfully updated." }
          format.json { render :show, status: :ok, location: @user }
        else
          format.html { render :edit, status: :unprocessable_entity }
          format.json { render json: @user.errors, status: :unprocessable_entity }
        end
      end
    end

    # DELETE /api/v1/users/1 or /api/v1/users/1.json
    def destroy
      @user.destroy!

      respond_to do |format|
        format.html { redirect_to api_v1_users_path, status: :see_other, notice: "User was successfully destroyed." }
        format.json { head :no_content }
      end
    end

    def login
      credentials = login_params
      user = User.find_by(email: credentials[:email])
      
      Rails.logger.debug "Login attempt for email: #{credentials[:email]}"
      Rails.logger.debug "Login attempt password: #{credentials[:password].present?}"
      Rails.logger.debug "Login attempt password: #{credentials[:password]}"
      Rails.logger.debug "User found: #{user.present?}"
      if user
        auth_result = user.authenticate(credentials[:password])
        Rails.logger.debug "Authentication result: #{auth_result}"
      end

      if user&.authenticate(credentials[:password])
        payload = { user_id: user.id }
        token = JsonWebToken.encode_and_set_cookie(payload, response)
        
        render json: {
          message: 'Logged in successfully',
          user: { id: user.id, email: user.email }
        }, status: :ok
      else
        render json: { error: 'Invalid email or password' }, status: :unauthorized
      end
    end

    def logout
      JsonWebToken.clear_cookie(response)
      render json: { message: 'Logged out successfully' }, status: :ok
    end

    def register
      credentials = register_params
      puts credentials
      @user = User.new(credentials)
      @user.email_validation_token = generate_token
      @user.email_validated = false

      if @user.save
        # Send validation email
        UserMailer.email_validation(@user).deliver_later
        
        render json: {
          message: 'User registered successfully. Please check your email to validate your account.',
          user: { id: @user.id, email: @user.email }
        }, status: :created
      else
        render json: { 
          errors: @user.errors.full_messages 
        }, status: :unprocessable_entity
      end
    end

    def validate_email
      token = params[:token]
      user = User.find_by(email_validation_token: token)

      if user
        user.update(email_validated: true, email_validation_token: nil)
        render json: { message: 'Email validated successfully' }, status: :ok
      else
        render json: { error: 'Invalid validation token' }, status: :not_found
      end
    end

    private
      # Use callbacks to share common setup or constraints between actions.
      def set_api_v1_user
        @user = User.find(params.expect(:id))
      end

      # Only allow a list of trusted parameters through.
      def user_params
        params.require(:user).permit(:id, :email, :password)
      end

      def login_params
        params.permit(:email, :password)
      end

      def register_params
        params.permit(:email, :password, :password_confirmation)
      end

      def generate_token
        SecureRandom.urlsafe_base64(32)
      end
  end
end 
