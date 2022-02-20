{-# LANGUAGE TypeApplications #-}
{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE DataKinds, OverloadedLabels #-}
module State where

import Universum
import Data.Text as Text (split, unpack, tail, splitOn)
import Data.Maybe (fromJust)
import Data.Generics.Labels ()
import Data.Time
import Time (parseInterval, parseInstant, parseDurationFrom, parseDurationTo, roundToPreviousHour, parseISO, Interval)
import Data.Time.Lens
import Control.Lens ((?~), (-~))
import JSDOM.Types (JSM)
import Browser (withDebug, locationHash)

newtype Layer = Layer Text
  deriving Show
newtype Degrees = Degrees Double
  deriving Show
newtype Location = Location Text
  deriving Show
data Mode = Map | Diagram
  deriving Show

data AppState = AppState {
  mode        :: Mode,
  rotation    :: Degrees,
  layers      :: [Layer],
  timeSetting :: TimeSetting,
  location    :: Maybe Location
} deriving (Show, Generic)

data TimeSetting =
    Instant UTCTime
  | Span Time.Interval
  | DurationFrom UTCTime CalendarDiffTime
  | DurationTo CalendarDiffTime UTCTime
  deriving (Show)

defaultTimeSetting :: IO TimeSetting
defaultTimeSetting = DurationFrom <$> (roundToPreviousHour . (flexDT.hours -~ 1) <$> getCurrentTime)
                                  <*> pure (fromJust (parseISO "PT4H"))

defaultState :: JSM AppState
defaultState = withDebug "defaultState" $
  AppState Map (Degrees 0) [] <$> liftIO defaultTimeSetting <*> pure Nothing

parseTimeSetting :: Text -> Maybe TimeSetting
parseTimeSetting x = Instant              <$> parseInstant x
                 <|> Span                 <$> parseInterval x
                 <|> uncurry DurationFrom <$> parseDurationFrom x
                 <|> uncurry DurationTo   <$> parseDurationTo x


hashPlaceholder :: Text
hashPlaceholder = "&loading..."

-- | parseLayers
-- >>> parseLayers ""
-- []
-- >>> parseLayers "ab"
-- [Layer "ab"]
-- >>> parseLayers "ab,cde"
-- [Layer "ab",Layer "cde"]
-- >>> parseLayers "abcd"
-- []
parseLayers :: Text -> [Layer]
parseLayers x =
  let xs       = split (== ',') x
      allValid = all ((||) <$> (== 2) . length <*> (==3) . length) xs
  in if allValid then Layer <$> xs else []

-- | parseDegrees
-- >>> parseDegrees "0"
-- Just (Degrees 0.0)
-- >>> parseDegrees "360"
-- Just (Degrees 360.0)
-- >>> parseDegrees "-1"
-- Nothing
-- >>> parseDegrees "360.1"
-- Nothing
parseDegrees :: Text -> Maybe Degrees
parseDegrees = fmap Degrees . mfilter (<= 360) . mfilter (>= 0) . readMaybe @Double . unpack

parseStatePart :: Text -> AppState -> AppState
parseStatePart txt = let
    parsedDegrees = parseDegrees txt
    parsedLayers  = parseLayers txt
    parsedTime    = parseTimeSetting txt
  in case txt of
    x | x == Text.tail hashPlaceholder -> id
    x | x `elem` ["kartta", "map"]     -> #mode .~ Map
    x | x `elem` ["kaavio", "diagram"] -> #mode .~ Diagram
    _ | isJust parsedDegrees           -> #rotation .~ fromJust parsedDegrees
    _ | not (null parsedLayers)        -> #layers .~ parsedLayers
    _ | isJust parsedTime              -> #timeSetting .~ fromJust parsedTime
    x                                  -> #location ?~ Location x

parseState :: [Text] -> JSM AppState
parseState parts = foldr parseStatePart <$> defaultState <*> pure parts

getStates :: JSM [AppState]
getStates = withDebug "getStates" $
  traverse (parseState . splitOn "&") . filter (not . null) . splitOn "#" =<< locationHash
