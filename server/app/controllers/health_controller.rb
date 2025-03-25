class HealthController < ApplicationController
  def show
    Rails.logger.info "Health check requested"
    render plain: 'ok', status: :ok
  end
end 