module AuthorizeApiRequest
  extend ActiveSupport::Concern

  included do
    before_action :authorize_request
  end

  private

  def authorize_request
    decoded = JsonWebToken.decode_from_cookie(request)
    if decoded
      @current_user = User.find_by(id: decoded[:user_id])
    else
      render json: { error: 'Unauthorized' }, status: :unauthorized
    end
  rescue ActiveRecord::RecordNotFound
    render json: { error: 'Unauthorized' }, status: :unauthorized
  end

  def current_user
    @current_user
  end
end 