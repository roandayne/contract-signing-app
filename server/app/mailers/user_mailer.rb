class UserMailer < ApplicationMailer
  def email_validation(user)
    @user = user
    @validation_url = validate_email_api_v1_users_url(token: @user.email_validation_token)
    
    Rails.logger.info "Sending validation email to #{@user.email}"
    
    mail(
      to: @user.email,
      subject: 'Validate your email',
      template_path: 'user_mailer',
      template_name: 'email_validation'
    )
  end
end 