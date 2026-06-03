/**
 * React Native's FormData.append supports RN file descriptor objects
 * ({ uri, name, type }) at runtime even though the TypeScript DOM type
 * only knows about Blob | string. This helper centralises the single
 * intentional type-widening so call-sites stay clean.
 */

export interface RNFileDescriptor {
  uri: string;
  name: string;
  type: string;
}

type RNFormData = { append(key: string, value: RNFileDescriptor | string): void };

export function appendRNFile(
  formData: FormData,
  key: string,
  file: RNFileDescriptor,
): void {
  (formData as unknown as RNFormData).append(key, file);
}
