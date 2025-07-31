export type FilterQueryParamsByField<T> = {
  [key in keyof T]?: string | number | boolean;
};
