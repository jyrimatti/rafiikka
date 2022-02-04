{-# LANGUAGE ScopedTypeVariables #-}

module Time (
    addDuration,
    removeDuration,
    parseInstant,
    parseInterval,
    parseDurationFrom,
    parseDurationTo,
    showISO,
    parseISO,
    roundToPreviousHour,
    roundToPreviousDay,
    roundToPreviousMonth,
    Interval(..)
) where

import Universum
import Data.Text (unpack, split, pack)
import Data.Time (CalendarDiffTime (CalendarDiffTime), addUTCTime, UTCTime)
import Data.Time.Format.ISO8601 (iso8601ParseM, ISO8601, iso8601Show)
import Data.Bitraversable (bitraverse)
import Control.Lens ((+~), (-~))
import Data.Generics.Labels ()
import Data.Time.Lens( months, FlexibleDateTime (flexDT), minutes, seconds, hours, days )
import Data.Time.Calendar.MonthDay ()
import Data.Time.Calendar.OrdinalDate ()

data Interval = Interval UTCTime UTCTime
  deriving Show

parsePair :: [Text] -> Maybe (Text,Text)
parsePair [x,y] = Just (x,y)
parsePair _ = Nothing

showISO :: ISO8601 t => t -> Text
showISO = pack . iso8601Show

-- | parseISO 
-- >>> parseISO "PT4H" :: Maybe CalendarDiffTime
-- Just P0MT14400S
-- >>> parseISO "2022-01-19T18:40:24.390Z" :: Maybe UTCTime
-- Just 2022-01-19 18:40:24.39 UTC
parseISO :: ISO8601 t => Text -> Maybe t
parseISO = iso8601ParseM . unpack

addDuration :: CalendarDiffTime -> UTCTime -> UTCTime
addDuration (CalendarDiffTime ctMonths ctTime) = addUTCTime ctTime . (flexDT.months +~ fromIntegral ctMonths)

removeDuration :: CalendarDiffTime -> UTCTime -> UTCTime
removeDuration (CalendarDiffTime ctMonths ctTime) = addUTCTime (-1*ctTime) . (flexDT.months -~ fromIntegral ctMonths)

parseInstant :: Text -> Maybe UTCTime
parseInstant = parseISO

-- | parseInterval
-- import Data.Time
-- >>> parseInterval "2014-02-14T01:02:03Z/2014-02-14T01:02:03Z"
-- Just (Interval 2014-02-14 01:02:03 UTC 2014-02-14 01:02:03 UTC)
-- >>> parseInterval "2014-02-14T01:02:03Z/2014-02-14T01:02:04Z"
-- Just (Interval 2014-02-14 01:02:03 UTC 2014-02-14 01:02:04 UTC)
-- >>> parseInterval "2014-02-14T01:02:03Z/2014-02-14T01:02:02Z"
-- Nothing
parseInterval :: Text -> Maybe Interval
parseInterval = fmap (uncurry Interval) . mfilter (uncurry (<=)) . bitraverse parseISO parseISO <=< parsePair . split (== '/')

parseDurationFrom :: Text -> Maybe (UTCTime,CalendarDiffTime)
parseDurationFrom = bitraverse parseISO parseISO <=< parsePair . split (== '/')

parseDurationTo :: Text -> Maybe (CalendarDiffTime, UTCTime)
parseDurationTo = bitraverse parseISO parseISO <=< parsePair . split (== '/')

-- | roundToPreviousHour
-- >>> import Data.Time
-- >>> (,) <$> id <*> roundToPreviousHour <$> parseInstant "2014-02-14T01:02:03Z"
-- Just (2014-02-14 01:02:03 UTC,2014-02-14 01:00:00 UTC)
-- >>> (,) <$> id <*> roundToPreviousHour <$> parseInstant "2014-02-14T00:02:03Z"
-- Just (2014-02-14 00:02:03 UTC,2014-02-14 00:00:00 UTC)
-- >>> (,) <$> id <*> roundToPreviousHour <$> parseInstant "2014-02-14T01:00:00Z"
-- Just (2014-02-14 01:00:00 UTC,2014-02-14 01:00:00 UTC)
roundToPreviousHour :: UTCTime -> UTCTime
roundToPreviousHour = (minutes .~ 0) . (seconds .~ 0)

-- | roundToPreviousDay
-- >>> (,) <$> id <*> roundToPreviousDay <$> parseInstant "2014-02-14T01:02:03Z"
-- Just (2014-02-14 01:02:03 UTC,2014-02-14 00:00:00 UTC)
roundToPreviousDay :: UTCTime -> UTCTime
roundToPreviousDay = (hours .~ 0) . (minutes .~ 0) . (seconds .~ 0)

-- | roundToPreviousMonth
-- >>> (,) <$> id <*> roundToPreviousMonth <$> parseInstant "2014-02-14T01:02:03Z"
-- Just (2014-02-14 01:02:03 UTC,2014-02-01 00:00:00 UTC)
roundToPreviousMonth :: UTCTime -> UTCTime
roundToPreviousMonth = (days .~ 0) . (hours .~ 0) . (minutes .~ 0) . (seconds .~ 0)
