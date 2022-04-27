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
    roundToNextMonth,
    startOfTime,
    endOfTime,
    roundCalendarDiffTimeToPreviousDay,
    Interval(..)
) where

import Universum hiding (unlessM, whenM, unless, when)
import Data.Text (unpack, pack)
import Data.Time (CalendarDiffTime (CalendarDiffTime), addUTCTime, UTCTime (UTCTime), Day, fromGregorian, secondsToDiffTime, nominalDay)
import Data.Time.Format.ISO8601 (iso8601ParseM, ISO8601, iso8601Show)
import Control.Lens ((+~), (-~))
import Data.Generics.Labels ()
import Data.Time.Lens( months, FlexibleDateTime (flexDT), minutes, seconds, hours, days )
import Data.Time.Calendar.MonthDay ()
import Data.Time.Calendar.OrdinalDate ()
import Language.Javascript.JSaddle (JSString, jsg, new)
import Monadic (doFromJSVal, guardP, isDefined, invoke)
import GHCJS.Marshal.Internal
import Data.Fixed (mod')

data Interval = Interval UTCTime UTCTime
  deriving Show

startOfTime :: UTCTime
startOfTime = UTCTime (fromGregorian 2010 01 01) (secondsToDiffTime 0)

endOfTime :: UTCTime
endOfTime = UTCTime (fromGregorian 2030 01 01) (secondsToDiffTime 0)

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
-- >>> (,) <$> id <*> roundToPreviousHour <$> parseISO "2014-02-14T01:02:03Z"
-- Just (2014-02-14 01:02:03 UTC,2014-02-14 01:00:00 UTC)
-- >>> (,) <$> id <*> roundToPreviousHour <$> parseISO "2014-02-14T00:02:03Z"
-- Just (2014-02-14 00:02:03 UTC,2014-02-14 00:00:00 UTC)
-- >>> (,) <$> id <*> roundToPreviousHour <$> parseISO "2014-02-14T01:00:00Z"
-- Just (2014-02-14 01:00:00 UTC,2014-02-14 01:00:00 UTC)
roundToPreviousHour :: UTCTime -> UTCTime
roundToPreviousHour = (minutes .~ 0) . (seconds .~ 0)

-- | roundToPreviousDay
-- >>> (,) <$> id <*> roundToPreviousDay <$> parseISO "2014-02-14T01:02:03Z"
-- Just (2014-02-14 01:02:03 UTC,2014-02-14 00:00:00 UTC)
roundToPreviousDay :: UTCTime -> UTCTime
roundToPreviousDay = (hours .~ 0) . (minutes .~ 0) . (seconds .~ 0)

-- | roundToPreviousMonth
-- >>> (,) <$> id <*> roundToPreviousMonth <$> parseISO "2014-02-14T01:02:03Z"
-- Just (2014-02-14 01:02:03 UTC,2014-02-01 00:00:00 UTC)
roundToPreviousMonth :: UTCTime -> UTCTime
roundToPreviousMonth = (days .~ 0) . (hours .~ 0) . (minutes .~ 0) . (seconds .~ 0)

-- | roundToNextMonth
-- >>> (,) <$> id <*> roundToNextMonth <$> parseISO "2014-02-14T01:02:03Z"
-- Just (2014-02-14 01:02:03 UTC,2014-03-01 00:00:00 UTC)
roundToNextMonth :: UTCTime -> UTCTime
roundToNextMonth = (days .~ 0) . (hours .~ 0) . (minutes .~ 0) . (seconds .~ 0) . (months +~ 1)

-- | roundCalendarDiffTimeToPreviousDay
-- >>> import Data.Maybe (fromJust)
-- >>> showISO $ roundCalendarDiffTimeToPreviousDay $ fromJust $ (parseISO "PT4H" :: Maybe CalendarDiffTime)
-- "P0D"
-- >>> showISO $ roundCalendarDiffTimeToPreviousDay $ fromJust $ (parseISO "P1DT4H" :: Maybe CalendarDiffTime)
-- "P1D"
-- >>> showISO $ roundCalendarDiffTimeToPreviousDay $ fromJust $ (parseISO "P1M1DT4H4M4S" :: Maybe CalendarDiffTime)
-- "P1M1D"
roundCalendarDiffTimeToPreviousDay :: CalendarDiffTime -> CalendarDiffTime
roundCalendarDiffTimeToPreviousDay (CalendarDiffTime ctMonths ctTime) = CalendarDiffTime ctMonths $ ctTime - (ctTime `mod'` nominalDay)

instance FromJSVal UTCTime where
  fromJSVal = doFromJSVal "UTCTime" $ \x -> do
    a <- invoke x "toISOString"
    guardP $ isDefined a
    c <- MaybeT $ fromJSVal a
    hoistMaybe $ parseISO c

instance ToJSVal UTCTime where
  toJSVal = new (jsg @JSString "Date") . showISO 

instance ToJSVal Day where
  toJSVal = new (jsg @JSString "Date") . showISO 

instance FromJSVal Day where
  fromJSVal = doFromJSVal "Day" $ \x -> do
    yy <- invoke x "getYear"
    mm <- invoke x "getMonth"
    dd <- invoke x "getDate"
    y <- MaybeT $ fromJSVal yy
    m <- MaybeT $ fromJSVal mm
    d <- MaybeT $ fromJSVal dd
    pure $ fromGregorian (fromIntegral @Int y) (m+1) d
