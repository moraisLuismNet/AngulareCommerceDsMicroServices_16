export interface ILogin {
  email: string;
  password: string;
  role?: string;
}

export interface ILoginResponse {
  email: string;
  token: string;
  role?: string;
}
