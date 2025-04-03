class Form < ApplicationRecord
    has_one_attached :file
    has_many :signatures, dependent: :destroy
end
