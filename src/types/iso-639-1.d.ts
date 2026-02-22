declare module "iso-639-1" {
  type Language = {
    code: string;
    name: string;
    nativeName: string;
  };

  interface ISO6391Static {
    getName(code: string): string;
    getNativeName(code: string): string;
    getAllNames(): string[];
    getAllNativeNames(): string[];
    getCode(name: string): string;
    getAllCodes(): string[];
    validate(code: string): boolean;
    getLanguages(codes: string[]): Language[];
  }

  const ISO6391: ISO6391Static;
  export default ISO6391;
}
