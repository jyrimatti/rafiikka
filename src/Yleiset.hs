{-# LANGUAGE ScopedTypeVariables #-}
{-# OPTIONS_GHC -Wno-orphans #-}

module Yleiset where

import Universum
import Data.Time (UTCTime)
import Data.Time.Calendar.MonthDay ()
import Data.Time.Calendar.OrdinalDate ()
import Time (roundToPreviousDay, roundToPreviousMonth, Interval (Interval))
import Control.Lens ((+~), (-~))
import Data.Time.Lens (months, FlexibleDateTime (flexDT))
import Data.List.NonEmpty (fromList)
import URISerialization (FromURIFragment(fromURIFragment))
import State (TimeSetting)

parseInterval_ :: Text -> Maybe TimeSetting 
parseInterval_ = fromURIFragment

startOfDayUTC_ :: UTCTime -> UTCTime
startOfDayUTC_ = roundToPreviousDay

startOfMonthUTC_ :: UTCTime -> UTCTime
startOfMonthUTC_ = roundToPreviousMonth

expandInterval :: Interval -> Interval
expandInterval (Interval start end) = Interval ((flexDT.months -~ 1) start)
                                               ((flexDT.months +~ 1) end)

laajennaAikavali_ :: NonEmpty UTCTime -> NonEmpty UTCTime
laajennaAikavali_ xs = case toList xs of
  [start, end] ->
    let
      (Interval a3 b3) = expandInterval $ Interval start end
    in fromList [a3, b3]
  _ -> xs
