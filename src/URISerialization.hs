{-# LANGUAGE ScopedTypeVariables, TypeApplications #-}
{-# LANGUAGE FlexibleInstances #-}
{-# LANGUAGE NamedFieldPuns #-}

module URISerialization (
    ToURIFragment(toURIFragment),
    FromURIFragment(fromURIFragment)
) where

import Universum hiding (drop)
import Data.Time (UTCTime, CalendarDiffTime, Day)
import Data.Text (split, toLower, unpack)
import Time (Interval (Interval), parseISO, showISO)
import State (Mode, AppState (..), Layer (Layer), Degrees (Degrees), Location (Location), TimeSetting (..), defaultRotation, defaultLayers, defaultMode)
import qualified Data.Text as Text
import Data.Bitraversable (Bitraversable(bitraverse))

class ToURIFragment a where
  toURIFragment :: a -> Text

class FromURIFragment a where
  fromURIFragment :: Text -> Maybe a


parsePair :: [Text] -> Maybe (Text,Text)
parsePair [x,y] = Just (x,y)
parsePair _ = Nothing

instance ToURIFragment Text where
  toURIFragment = id

instance ToURIFragment Natural where
  toURIFragment = show

instance ToURIFragment Int where
  toURIFragment = show

-- Time.hs

instance FromURIFragment UTCTime where
  fromURIFragment = parseISO

instance ToURIFragment UTCTime where
  toURIFragment = showISO

-- | fromURIFragment
-- >>> :set -XTypeApplications
-- >>> fromURIFragment @Interval  "2014-02-14T01:02:03Z/2014-02-14T01:02:03Z"
-- Just (Interval 2014-02-14 01:02:03 UTC 2014-02-14 01:02:03 UTC)
-- >>> fromURIFragment @Interval  "2014-02-14T01:02:03Z/2014-02-14T01:02:04Z"
-- Just (Interval 2014-02-14 01:02:03 UTC 2014-02-14 01:02:04 UTC)
-- >>> fromURIFragment @Interval "2014-02-14T01:02:03Z/2014-02-14T01:02:02Z"
-- Nothing
instance FromURIFragment Interval where
  fromURIFragment = fmap (uncurry Interval) . mfilter (uncurry (<=)) . bitraverse parseISO parseISO <=< parsePair . split (== '/')

instance ToURIFragment Interval where
  toURIFragment (Interval a b) = toURIFragment a <> "/" <> toURIFragment b

instance FromURIFragment (UTCTime,CalendarDiffTime) where
  fromURIFragment = bitraverse parseISO parseISO <=< parsePair . split (== '/')

instance ToURIFragment (UTCTime,CalendarDiffTime) where
  toURIFragment (a,b) = showISO a <> "/" <> showISO b

instance FromURIFragment (CalendarDiffTime, UTCTime) where
  fromURIFragment = bitraverse parseISO parseISO <=< parsePair . split (== '/')

instance ToURIFragment (CalendarDiffTime, UTCTime) where
  toURIFragment (a,b) = showISO a <> "/" <> showISO b

-- | ToURIFragment Day
-- >>> import Data.Time.Calendar
-- >>> toURIFragment (fromGregorian 2014 02 14)
-- "2014-02-14"
instance ToURIFragment Day where
  toURIFragment = showISO

-- State.hs

instance ToURIFragment Mode where
  toURIFragment = toLower . show

instance ToURIFragment Location where
  toURIFragment (Location x) = x

-- | parseDegrees
-- >>> parseDegrees "0"
-- Just (Degrees 0.0)
-- >>> parseDegrees "360"
-- Just (Degrees 360.0)
-- >>> parseDegrees "-1"
-- Nothing
-- >>> parseDegrees "360.1"
-- Nothing
instance FromURIFragment Degrees where
  fromURIFragment = fmap Degrees . mfilter (<= 360) . mfilter (>= 0) . readMaybe @Double . unpack

instance ToURIFragment Degrees where
  toURIFragment (Degrees x) = show x

-- | parseLayers
-- >>> parseLayers ""
-- []
-- >>> parseLayers "ab"
-- [Layer "ab"]
-- >>> parseLayers "ab,cde"
-- [Layer "ab",Layer "cde"]
-- >>> parseLayers "abcd"
-- []
instance FromURIFragment [Layer] where
  fromURIFragment x =
    let xs       = split (== ',') x
        allValid = all ((||) <$> (== 2) . length <*> (==3) . length) xs
    in if allValid then Just (Layer <$> xs) else Nothing

instance ToURIFragment Layer where
  toURIFragment (Layer x) = x

instance ToURIFragment AppState where
  toURIFragment x = Text.intercalate "&" $ filter (/= "") $ fromMaybe "" . ($ x) <$> [printMode, printRotation, printLayers, printTimeSetting, printLocation]

instance ToURIFragment TimeSetting where
  toURIFragment (Instant a) = toURIFragment a
  toURIFragment (Span a) = toURIFragment a
  toURIFragment (DurationFrom a b) = toURIFragment (a,b)
  toURIFragment (DurationTo a b) = toURIFragment (a,b)

instance FromURIFragment TimeSetting where
  fromURIFragment x = Instant             <$> fromURIFragment x
                 <|> Span                 <$> fromURIFragment x
                 <|> uncurry DurationFrom <$> fromURIFragment x
                 <|> uncurry DurationTo   <$> fromURIFragment x

printMode, printRotation, printLayers, printTimeSetting, printLocation :: AppState -> Maybe Text

printMode AppState{mode} = if mode == defaultMode then Nothing else Just $ toURIFragment mode

-- | printRotation
-- >>> printRotation $ AppState Map (Degrees 0) [] (Instant undefined) Nothing
-- Nothing
-- >>> printRotation $ AppState Map (Degrees 1) [] (Instant undefined) Nothing
-- Just "1.0"
printRotation AppState{rotation} = if rotation == defaultRotation then Nothing else Just $ toURIFragment rotation

printLayers AppState{layers} = if layers == defaultLayers then Nothing else Just $ Text.intercalate "," $ toURIFragment <$> layers

printTimeSetting = Just . toURIFragment . timeSetting

printLocation = fmap toURIFragment . location
