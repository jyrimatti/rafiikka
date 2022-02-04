module Main where

import Build_doctests
import System.Environment (unsetEnv)
import Test.DocTest (doctest)
import Universum

main :: IO ()
main = do
    traverse_ putStrLn args -- optionally print arguments
    unsetEnv "GHC_ENVIRONMENT" -- see 'Notes'; you may not need this
    doctest args
  where
    args = flags_exe_Rafiikka ++ pkgs_exe_Rafiikka ++ module_sources_exe_Rafiikka