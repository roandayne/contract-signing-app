class JsonWebToken
  SECRET_KEY = ENV['JWT_SECRET_KEY'] || Rails.application.credentials.secret_key_base
  COOKIE_NAME = 'jwt'

  def self.encode_and_set_cookie(payload, response, exp = 24.hours.from_now)
    payload[:exp] = exp.to_i
    payload[:user_id] = payload[:user_id]
    token = JWT.encode(payload, SECRET_KEY)
    
    response.set_cookie(
      COOKIE_NAME,
      {
        value: token,
        expires: Time.at(payload[:exp]),
        httponly: true,
        secure: Rails.env.production?,
        same_site: :strict
      }
    )
    token
  end

  def self.decode_from_cookie(request)
    token = request.cookies[COOKIE_NAME]
    return nil unless token

    body = JWT.decode(token, SECRET_KEY)[0]
    HashWithIndifferentAccess.new(body)
  rescue JWT::DecodeError
    nil
  end

  def self.clear_cookie(response)
    response.delete_cookie(COOKIE_NAME)
  end

  def self.encode(payload, exp = 24.hours.from_now)
    payload[:exp] = exp.to_i
    JWT.encode(payload, SECRET_KEY)
  end

  def self.decode(token)
    body = JWT.decode(token, SECRET_KEY)[0]
    HashWithIndifferentAccess.new(body)
  rescue
    nil
  end
end 