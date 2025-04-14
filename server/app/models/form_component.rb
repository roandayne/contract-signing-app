class FormComponent < ApplicationRecord
  belongs_to :form
  
  validates :original_filename, presence: true
  validates :page_count, presence: true, numericality: { greater_than: 0 }
  validates :start_page, presence: true, numericality: { greater_than: 0 }
  validates :end_page, presence: true, numericality: { greater_than: 0 }
  validates :order_index, presence: true, numericality: { greater_than_or_equal_to: 0 }
  
  validate :validate_page_numbers
  
  private
  
  def validate_page_numbers
    return unless start_page && end_page && page_count
    
    if end_page < start_page
      errors.add(:end_page, "must be greater than or equal to start page")
    end
    
    if end_page - start_page + 1 != page_count
      errors.add(:base, "page range must match page count")
    end
  end
end 