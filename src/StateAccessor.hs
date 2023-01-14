{-# LANGUAGE DataKinds, OverloadedLabels, DerivingVia, OverloadedStrings #-}
module StateAccessor where

import Universum
import Data.Text as Text (tail, splitOn, intercalate)
import Data.Maybe (fromJust)
import Data.Generics.Labels ()
import Control.Lens ((?~), Ixed (ix), folded, ifiltered, toListOf)
import JSDOM.Types (JSM)
import Browser.Browser (withDebug, locationHash, setLocationHash)
import State (AppState, hashPlaceholder, Mode (Map, Diagram), Location (Location), defaultState)
import URISerialization (fromURIFragment, ToURIFragment (toURIFragment))

parseStatePart :: Text -> AppState -> AppState
parseStatePart txt = let
    parsedDegrees = fromURIFragment txt
    parsedLayers  = fromMaybe [] $ fromURIFragment txt
    parsedTime    = fromURIFragment txt
  in case txt of
    x | x == Text.tail hashPlaceholder -> id
    x | x `elem` ["kartta", "map"]     -> #mode .~ Map
    x | x `elem` ["kaavio", "diagram"] -> #mode .~ Diagram
    _ | isJust parsedDegrees           -> #rotation .~ fromJust parsedDegrees
    _ | not (null parsedLayers)        -> #layers .~ parsedLayers
    _ | isJust parsedTime              -> #timeSetting .~ fromJust parsedTime
    x                                  -> #location ?~ Location x

parseState :: AppState -> Text -> AppState
parseState defState = foldr parseStatePart defState . splitOn "&"

getStates :: JSM [AppState]
getStates = withDebug "getStates" $ do
  locHash <- locationHash
  case splitOn "#" locHash of
    []                      -> (: []) <$> defaultState
    [mainState]             -> do
      defMainState <- defaultState
      pure [parseState defMainState mainState]
    (mainState : subStates) -> do
      defMainState <- defaultState
      let mainSt = parseState defMainState mainState
      let subSt = parseState mainSt <$> subStates
      pure $ mainSt : subSt

getState :: Int -> JSM AppState
getState i = maybe getMainState pure . (safeHead . drop i) =<< getStates

getMainState :: JSM AppState
getMainState = getState 0

persistState :: [AppState] -> JSM ()
persistState = setLocationHash . Text.intercalate "#" . fmap toURIFragment

setState :: Int -> AppState -> JSM ()
setState i newState = do
  states <- getStates
  if length states <= i
    then do
      setLocationHash . (<> "#") =<< locationHash
      setState i newState
    else
      persistState . (ix i .~ newState) $ states

setMainState :: AppState -> JSM ()
setMainState = setState 0

removeSubState :: Int -> JSM()
removeSubState index = persistState . toListOf (folded . ifiltered ((/= index) ... const)) =<< getStates
