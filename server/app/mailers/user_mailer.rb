class UserMailer < ApplicationMailer
  def email_validation(user)
    @user = user
    @validation_url = validate_email_api_v1_users_url(token: @user.email_validation_token)
    
    mail(
      to: @user.email,
      subject: 'Validate your email'
    )
  end
end 