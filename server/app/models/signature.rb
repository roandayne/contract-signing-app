class Signature < ApplicationRecord
    belongs_to :form
    validates :page_number, presence: true, numericality: { only_integer: true, greater_than: 0 }
end
