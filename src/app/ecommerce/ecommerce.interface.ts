export interface IGenre {
  idMusicGenre?: number;
  nameMusicGenre: string;
  totalGroups?: number;
}

export interface IGroup {
  idGroup: number;
  nameGroup: string;
  imageGroup: string | null;
  photo?: File | null;
  photoName?: string | null;
  totalRecords?: number;
  musicGenreId: number;
  musicGenreName: string;
  musicGenre: string;
}

export interface IRecord {
  idRecord: number;
  titleRecord: string;
  yearOfPublication: number | null;
  price: number;
  stock: number;
  discontinued: boolean;
  groupId: number | null;
  groupName: string;
  nameGroup: string;
  inCart?: boolean;
  amount?: number;
  imageRecord: string | null;
  photo: File | null;
  photoName: string | null;
}

export interface ICartDetail {
  recordTitle: string;
  idCartDetail?: number;
  recordId: number;
  amount: number;
  cartId: number;
  record?: IRecord;
  titleRecord?: string;
  groupName?: string;
  price?: number;
  total?: number;
}

export interface ICart {
  cartDetails?: any;
  idCart: number;
  userEmail: string;
  totalPrice: number;
  enabled?: boolean;
}

export interface IOrder {
  idOrder: number;
  orderDate: string;
  paymentMethod: string;
  total: number;
  userEmail: string;
  cartId: number;
  orderDetails: IOrderDetail[];
}

export interface IOrderDetail {
  idOrderDetail: number;
  orderId: number;
  recordId: number;
  recordTitle?: string;
  amount: number;
  price: number;
  total: number;
}

export interface IUser {
  email: string;
  role: string;
}
