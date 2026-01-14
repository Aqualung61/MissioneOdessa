export {};

declare global {
  // Popolato dai test (o da initOdessa a runtime). In test lo trattiamo come contenitore JSON.
  // Manteniamo any per evitare conflitti tra dichiarazioni e per non forzare casting ovunque.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var odessaData: any | undefined;
}
