{ pkgs }: {
  deps = [
    pkgs.nodejs-20_x
    pkgs.pnpm
    pkgs.nodePackages.typescript
  ];
}
