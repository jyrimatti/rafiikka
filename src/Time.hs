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
    intervalsIntersect,
    limitInterval,
    toISOStringNoMillis,
    infiniteInterval,
    Interval(..)
) where

import Universum hiding (unlessM, whenM, unless, when)
import Data.Text (unpack, pack, split)
import Data.Time (CalendarDiffTime (CalendarDiffTime), addUTCTime, UTCTime (UTCTime), Day, fromGregorian, nominalDay)
import Data.Time.Format.ISO8601 (iso8601ParseM, ISO8601, iso8601Show)
import Data.Generics.Labels ()
import Data.Time.Lens(modL, month, minutes, setL, seconds, hours, day)
import Data.Time.Calendar.MonthDay ()
import Data.Time.Calendar.OrdinalDate ()
import Language.Javascript.JSaddle (JSString, jsg, new)
import Monadic (doFromJSVal, guardP, isDefined, invoke)
import GHCJS.Marshal.Internal ( FromJSVal(fromJSVal), ToJSVal(toJSVal) )
import Data.Fixed (mod', Fixed (MkFixed))

data Interval = Interval UTCTime UTCTime
  deriving Show

startOfTime :: UTCTime
startOfTime = UTCTime (fromGregorian 2010 01 01) 0

endOfTime :: UTCTime
endOfTime = UTCTime (fromGregorian 2030 01 01) 0

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
addDuration (CalendarDiffTime ctMonths ctTime) = addUTCTime ctTime . modL month (+ fromIntegral ctMonths)

removeDuration :: CalendarDiffTime -> UTCTime -> UTCTime
removeDuration (CalendarDiffTime ctMonths ctTime) = addUTCTime (-1*ctTime) . modL month (subtract $ fromIntegral ctMonths)

-- | roundToPreviousHour
-- >>> import Data.Time
-- >>> (,) <$> id <*> roundToPreviousHour <$> parseISO "2014-02-14T01:02:03Z"
-- Just (2014-02-14 01:02:03 UTC,2014-02-14 01:00:00 UTC)
-- >>> (,) <$> id <*> roundToPreviousHour <$> parseISO "2014-02-14T00:02:03Z"
-- Just (2014-02-14 00:02:03 UTC,2014-02-14 00:00:00 UTC)
-- >>> (,) <$> id <*> roundToPreviousHour <$> parseISO "2014-02-14T01:00:00Z"
-- Just (2014-02-14 01:00:00 UTC,2014-02-14 01:00:00 UTC)
roundToPreviousHour :: UTCTime -> UTCTime
roundToPreviousHour = setL minutes 0 . setL seconds 0

-- | roundToPreviousDay
-- >>> (,) <$> id <*> roundToPreviousDay <$> parseISO "2014-02-14T01:02:03Z"
-- Just (2014-02-14 01:02:03 UTC,2014-02-14 00:00:00 UTC)
roundToPreviousDay :: UTCTime -> UTCTime
roundToPreviousDay = setL hours 0 . setL minutes 0 . setL seconds 0

-- | roundToPreviousMonth
-- >>> (,) <$> id <*> roundToPreviousMonth <$> parseISO "2014-02-14T01:02:03Z"
-- Just (2014-02-14 01:02:03 UTC,2014-02-01 00:00:00 UTC)
roundToPreviousMonth :: UTCTime -> UTCTime
roundToPreviousMonth = setL day 1 . setL hours 0 . setL minutes 0 . setL seconds 0

-- | roundToNextMonth
-- >>> (,) <$> id <*> roundToNextMonth <$> parseISO "2014-02-14T01:02:03Z"
-- Just (2014-02-14 01:02:03 UTC,2014-03-01 00:00:00 UTC)
roundToNextMonth :: UTCTime -> UTCTime
roundToNextMonth = setL day 1 . setL hours 0 . setL minutes 0 . setL seconds 0 . modL month (+ 1)

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

-- | intervalsIntersect
-- >>> let a = UTCTime (fromGregorian 2010 01 01) 0
-- >>> let b = UTCTime (fromGregorian 2011 01 01) 0
-- >>> let c = UTCTime (fromGregorian 2012 01 01) 0
-- >>> intervalsIntersect (Interval a b) (Interval b c)
-- False
-- >>> intervalsIntersect (Interval a c) (Interval a c)
-- True
-- >>> intervalsIntersect (Interval a b) (Interval a c)
-- True
intervalsIntersect :: Interval -> Interval -> Bool
intervalsIntersect (Interval a1 a2) (Interval b1 b2) = a1 < b2 && b1 < a2

-- | limitInterval
-- >>> let a = parseISO "2010-01-01T00:00:00Z"
-- >>> let b = parseISO "2011-01-01T00:00:00Z"
-- >>> limitInterval <$> (Interval <$> a <*> b)
-- Just (Interval 2010-01-01 00:00:00 UTC 2011-01-01 00:00:00 UTC)
-- >>> let a = parseISO "2000-01-01T00:00:00Z"
-- >>> let b = parseISO "3000-01-01T00:00:00Z"
-- >>> limitInterval <$> (Interval <$> a <*> b)
-- Just (Interval 2010-01-01 00:00:00 UTC 2030-01-01 00:00:00 UTC)
limitInterval :: Interval -> Interval
limitInterval (Interval start end) = Interval (max startOfTime start) (min end endOfTime)

infiniteInterval :: Interval
infiniteInterval = Interval startOfTime endOfTime

-- | toISOStringNoMillis
-- >>> import Data.Time.Clock (DiffTime)
-- >>> toISOStringNoMillis <$> parseISO "2010-01-01T00:00:00Z"
-- Just "2010-01-01T00:00:00Z"
-- >>> toISOStringNoMillis <$> parseISO "2010-01-01T00:00:00.1Z"
-- Just "2010-01-01T00:00:00Z"
toISOStringNoMillis :: UTCTime -> Text
toISOStringNoMillis = showISO . modL seconds (MkFixed . truncate)

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

instance ToJSVal Interval where
  toJSVal (Interval start end) = toJSVal $ showISO start <> "/" <> showISO end

instance FromJSVal Interval where
  fromJSVal = doFromJSVal "Interval" $ \x -> do
    text <- MaybeT $ fromJSVal x
    let xs = split (== '/') text
    xss <- hoistMaybe $ nonEmpty xs
    let a = head xss
    xsss <- hoistMaybe $ nonEmpty $ tail xss
    let b = head xsss
    aa <- hoistMaybe $ parseISO a
    bb <- hoistMaybe $ parseISO b
    guard $ aa <= bb
    pure $ Interval aa bb

instance FromJSVal CalendarDiffTime where
  fromJSVal = doFromJSVal "CalendarDiffTime" $ \x -> do
    txt :: Text <- MaybeT $ fromJSVal x
    hoistMaybe $ parseISO txt