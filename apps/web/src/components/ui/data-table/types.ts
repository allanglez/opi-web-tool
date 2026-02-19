export type DataTablePrimitive = string | number | boolean | null | undefined | Date;

type BivariantCallback<Args extends unknown[], Return> = {
  bivarianceHack(...args: Args): Return;
}['bivarianceHack'];

export interface DataTableColumn<T> {
  key: string;
  header: string;
  value: BivariantCallback<[T], DataTablePrimitive>;
  sortable?: boolean;
  searchable?: boolean;
  sortValue?: BivariantCallback<[T], DataTablePrimitive>;
  align?: 'left' | 'center' | 'right';
}
