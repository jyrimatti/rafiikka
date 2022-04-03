let
  f =
    build-or-shell:
    { chan ? "e426655e91b96030e068aebd19d5e744a15b5de4"
    , compiler ? "ghc8107"
    , withHoogle ? false
    , doHoogle ? false
    , doHaddock ? false
    , enableLibraryProfiling ? false
    , enableExecutableProfiling ? false
    , strictDeps ? false
    , isJS ? false
    , system ? builtins.currentSystem
    , optimize ? true
    , shpadoinkle-path ? ../../Shpadoinkle
    }:
    let


      # It's a shpadoinkle day
      shpadoinkle = if shpadoinkle-path != null then shpadoinkle-path else builtins.fetchGit {
        url    = https://gitlab.com/platonic/shpadoinkle.git;
        ref    = "ghc8107";
        rev    = "bbc22adb29bcb7f655d54ee8a73be2bd20437c62";
      };


      # Get some utilities
      inherit (import (shpadoinkle + "/nix/util.nix") { inherit compiler isJS pkgs; }) compilerjs doCannibalize;


      # Build faster by doing less
      chill = p: (pkgs.haskell.lib.overrideCabal p {
        inherit enableLibraryProfiling enableExecutableProfiling;
      }).overrideAttrs (_: {
        inherit doHoogle doHaddock strictDeps;
      });


      # Overlay containing Shpadoinkle packages, and needed alterations for those packages
      # as well as optimizations from Reflex Platform
      shpadoinkle-overlay =
        import (shpadoinkle + "/nix/overlay.nix") { inherit compiler chan isJS enableLibraryProfiling enableExecutableProfiling; };


      # Haskell specific overlay (for you to extend)
      haskell-overlay = hself: hsuper: {
        "happy" = pkgs.haskell.lib.dontCheck hsuper.happy;
        "universum" = pkgs.haskell.lib.dontCheck hsuper.universum;

        # https://github.com/ghcjs/jsaddle/issues/123
        jsaddle = pkgs.haskell.lib.overrideCabal hsuper.jsaddle (drv: {
           # lift conditional version constraint on ref-tf
           postPatch = ''
             sed -i 's/ref-tf.*,/ref-tf,/' jsaddle.cabal
           '' + (drv.postPatch or "");
         });

         stm = if isJS then hsuper.stm_2_5_0_2 else hsuper.stm;
      };


      # Top level overlay (for you to extend)
      Rafiikka-app-overlay = self: super: {
        haskell = super.haskell //
          { packages = super.haskell.packages //
            { ${compilerjs} = super.haskell.packages.${compilerjs}.override (old: {
                overrides = super.lib.composeExtensions (old.overrides or (_: _: {})) haskell-overlay;
              });
            };
          };
        };


      # Complete package set with overlays applied
      pkgs = import
        (builtins.fetchTarball {
          url = "https://github.com/NixOS/nixpkgs/archive/${chan}.tar.gz";
        }) {
        inherit system;
        overlays = [
          shpadoinkle-overlay
          Rafiikka-app-overlay
        ];
      };


      ghcTools = with pkgs.haskell.packages.${compiler};
        [ cabal-install
          ghcid
        ] ++ (if isJS then [] else [ stylish-haskell ]);


      # We can name him George
      Rafiikka =
        with builtins;
        let
          l = pkgs.lib;
          source = ../.;
        in
        pkgs.haskell.packages.${compilerjs}.callCabal2nix "Rafiikka"
          (filterSource
             (path: type:
                let
                  relative = replaceStrings [(toString source + "/")] [""] path;
                in
                l.hasPrefix "src" relative && type == "directory"
                || l.hasSuffix ".hs" path
                || l.hasSuffix ".cabal" path
             )
             source
          )
          {};


    in with pkgs; with lib;

      { build =
          (if isJS && optimize then doCannibalize else x: x) (chill Rafiikka);

        shell =
          pkgs.haskell.packages.${compilerjs}.shellFor {
            inherit withHoogle;
            packages    = _: [ Rafiikka ];
            COMPILER    = compilerjs;
            buildInputs = ghcTools;
            shellHook   = ''
              ${lolcat}/bin/lolcat ${../figlet}
              cat ${../intro}
            '';
          };
      }.${build-or-shell};
in
  { build = f "build";
    shell = f "shell";
  }
