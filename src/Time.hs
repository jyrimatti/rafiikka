{-# LANGUAGE ScopedTypeVariables #-}

module Time (
    addDuration,
    removeDuration,
    parseInstant,
    parseInterval,
    parseDurationFrom,
    parseDurationTo,
    showISO
) where

import Data.Text (unpack, split, pack)
import Data.Time (UTCTime (UTCTime), CalendarDiffTime (CalendarDiffTime), addUTCTime, addGregorianMonthsClip)
import Data.Time.Format.ISO8601 (iso8601ParseM, ISO8601, iso8601Show)
import Data.Bitraversable (bitraverse)
import Control.Lens ()
import Data.Time.Calendar.MonthDay ()
import Data.Time.Calendar.OrdinalDate ()
import Universum

parsePair :: [Text] -> Maybe (Text,Text)
parsePair [x,y] = Just (x,y)
parsePair _ = Nothing

showISO :: ISO8601 t => t -> Text
showISO = pack . iso8601Show

parseISO :: ISO8601 t => Text -> Maybe t
parseISO = iso8601ParseM . unpack

addDuration :: UTCTime -> CalendarDiffTime -> UTCTime
addDuration (UTCTime day time) (CalendarDiffTime ctMonths ctTime) =
  let newDay = addGregorianMonthsClip ctMonths day
      newTime = UTCTime newDay time
  in addUTCTime ctTime newTime

removeDuration :: UTCTime -> CalendarDiffTime -> UTCTime
removeDuration (UTCTime day time) (CalendarDiffTime ctMonths ctTime) =
  let newDay = addGregorianMonthsClip (-1*ctMonths) day
      newTime = UTCTime newDay (-1*time)
  in addUTCTime ctTime newTime

parseInstant :: Text -> Maybe UTCTime
parseInstant = parseISO

parseInterval :: Text -> Maybe (UTCTime,UTCTime)
parseInterval = bitraverse parseISO parseISO <=< parsePair . split (== '/')

parseDurationFrom :: Text -> Maybe (UTCTime,CalendarDiffTime)
parseDurationFrom = bitraverse parseISO parseISO <=< parsePair . split (== '/')

parseDurationTo :: Text -> Maybe (CalendarDiffTime, UTCTime)
parseDurationTo = bitraverse parseISO parseISO <=< parsePair . split (== '/')
