{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE FlexibleInstances #-}
{-# LANGUAGE TypeApplications #-}
{-# OPTIONS_GHC -Wno-orphans #-}

module Time (
    addDuration,
    removeDuration,
    showISO,
    parseISO,
    roundToPreviousHour,
    roundToPreviousDay,
    roundToPreviousMonth,
    Interval(..)
) where

import Universum
import Data.Text (unpack, pack)
import Data.Time (CalendarDiffTime (CalendarDiffTime), addUTCTime, UTCTime)
import Data.Time.Format.ISO8601 (iso8601ParseM, ISO8601, iso8601Show)
import Control.Lens ((+~), (-~))
import Data.Generics.Labels ()
import Data.Time.Lens( months, FlexibleDateTime (flexDT), minutes, seconds, hours, days )
import Data.Time.Calendar.MonthDay ()
import Data.Time.Calendar.OrdinalDate ()
import JSDOM.Types (ToJSVal)
import Language.Javascript.JSaddle (ToJSVal(toJSVal), JSString, FromJSVal (fromJSVal), ghcjsPure, isUndefined, (!), js0, jsg, new)
import FFI (deserializationFailure)
import GHCJS.Foreign (isFunction)

data Interval = Interval UTCTime UTCTime
  deriving Show

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

instance FromJSVal UTCTime where
  fromJSVal x = do
    undef <- ghcjsPure $ isUndefined x
    if undef
      then deserializationFailure x "UTCTime"
      else do
        a <- x ! ("toISOString" :: JSString)
        isFun <- ghcjsPure $ isFunction a
        if not isFun
          then deserializationFailure x "UTCTime"
          else do
            b <- x ^. js0 ("toISOString" :: JSString)
            isUndef <- ghcjsPure $ isUndefined b
            if isUndef
              then deserializationFailure x "UTCTime"
              else do
                a1 <- fromJSVal b
                pure $ parseISO =<< a1

instance ToJSVal UTCTime where
  toJSVal = new (jsg @JSString "Date") . showISO 