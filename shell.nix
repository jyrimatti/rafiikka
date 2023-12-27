{ nixpkgs ? import <nixpkgs> {}, compiler ? "default", doBenchmark ? false }:

let

  inherit (nixpkgs) pkgs;
  inherit (pkgs) stdenv targetPlatform;

  f = { mkDerivation, aeson, base, bytestring, Cabal, cabal-doctest
      , clay, containers, control-bool, data-foldapp, extra, generic-lens
      , jsaddle, jsaddle-dom, jsaddle-warp, lens, lens-action, lib, megaparsec, miso
      , modern-uri, random, regex, text, time, time-lens, universum
      , utility-ht, cabal-install, haskell-language-server, ghcid, ghcWithJS
      }:
      
      mkDerivation {
        pname = "Rafiikka";
        version = "0.1.0.0";
        src = ./.;
        isLibrary = false;
        isExecutable = true;
        setupHaskellDepends = [ base Cabal cabal-doctest ];
        buildDepends = [ ghcWithJS
                         cabal-install
                         haskell-language-server
                         ghcid
                         cabal-doctest ];
        executableHaskellDepends = [
          aeson base bytestring cabal-doctest clay containers control-bool
          data-foldapp extra generic-lens jsaddle jsaddle-dom jsaddle-warp lens
          lens-action megaparsec miso modern-uri random regex text time
          time-lens universum utility-ht
        ];
        license = "unknown";
        mainProgram = "Rafiikka";
      };

  haskellPackages = if compiler == "default"
                       then pkgs.haskell.packages.ghc96
                       else pkgs.haskell.packages.${compiler};

  variant = if doBenchmark then pkgs.haskell.lib.doBenchmark else pkgs.lib.id;

  ghcWithJS = pkgs.haskell.compiler.ghc96.override { stdenv = stdenv.override { targetPlatform = targetPlatform // { isGhcjs = true; }; }; };

  drv = variant (haskellPackages.callPackage f { ghcWithJS = ghcWithJS; });

in

  if pkgs.lib.inNixShell then drv.env else drv
