export interface ApiResponse<T> {
  success: boolean
  data?: T
  timestamp: string
}

export interface ApiErrorResponse {
  success: false
  error: ErrorDetail
}

export interface ErrorDetail {
  code: string
  message: string
  details?: ValidationError[]
  timestamp: string
}

export interface ValidationError {
  field: string
  message: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total_count: number
  page: number
  page_size: number
  total_pages: number
}

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: ValidationError[]
  ) {
    super(message)
    this.name = 'AppError'
  }
}