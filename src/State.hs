{-# LANGUAGE LambdaCase, TypeApplications, DeriveGeneric, DerivingVia, OverloadedStrings #-}
module State where

import Universum
import Data.Maybe (fromJust)
import Data.Time ( UTCTime, getCurrentTime, CalendarDiffTime )
import Time (showISO, parseISO, Interval (Interval), removeDuration, addDuration, roundToPreviousHour, roundToPreviousDay, roundCalendarDiffTimeToPreviousDay)
import Language.Javascript.JSaddle (new, jsg, ToJSVal (toJSVal), JSString, FromJSVal (fromJSVal), ghcjsPure, (<#), obj, jsUndefined)
import JSDOM.Types (JSM)
import Browser.Browser (withDebug)
import Monadic (doFromJSVal, isDefined, propFromJSVal)
import Control.Lens.Traversal (both)
import Data.Time.Lens (modL, hours)
import Control.Applicative.HT (lift5)

newtype Layer = Layer Text
  deriving (Show, Eq)
newtype Degrees = Degrees Double
  deriving (Show, Eq)
newtype Location = Location Text
  deriving (Show)
data Mode = Map | Diagram
  deriving (Show, Eq)

instance FromJSVal Mode where
  fromJSVal = doFromJSVal "Mode" $ \x -> do
    MaybeT (fromJSVal @Text x) >>= \case
     "map"     -> pure Map
     "diagram" -> pure Diagram
     _ -> mzero

instance ToJSVal Mode where
  toJSVal Map     = toJSVal @Text "map"
  toJSVal Diagram = toJSVal @Text "diagram"

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
  deriving Show

toInterval :: TimeSetting -> Interval
toInterval (Instant t) = Interval t t
toInterval (Span i)    = i
toInterval (DurationFrom t d) = Interval t $ addDuration d t
toInterval (DurationTo d t) = Interval (removeDuration d t) t

roundTimeSettingToPreviousDay :: TimeSetting -> TimeSetting
roundTimeSettingToPreviousDay (Instant t)           = Instant $ roundToPreviousDay t
roundTimeSettingToPreviousDay (Span (Interval s e)) = Span $ Interval (roundToPreviousDay s) (roundToPreviousDay e)
roundTimeSettingToPreviousDay (DurationFrom t d)    = DurationFrom (roundToPreviousDay t) (roundCalendarDiffTimeToPreviousDay d)
roundTimeSettingToPreviousDay (DurationTo d t)      = DurationTo (roundCalendarDiffTimeToPreviousDay d) (roundToPreviousDay t)

defaultMode :: Mode
defaultMode = Map

defaultRotation :: Degrees
defaultRotation = Degrees 0

defaultLayers :: [Layer]
defaultLayers = []

defaultTimeSetting :: IO TimeSetting
defaultTimeSetting = DurationFrom <$> (roundToPreviousHour . modL hours (subtract 1) <$> getCurrentTime)
                                  <*> pure (fromJust (parseISO "PT4H"))

defaultState :: JSM AppState
defaultState = withDebug "defaultState" $
  AppState defaultMode defaultRotation defaultLayers <$> liftIO defaultTimeSetting <*> pure Nothing

hashPlaceholder :: Text
hashPlaceholder = "&loading..."

getStart :: TimeSetting -> UTCTime
getStart (Instant x)           = x
getStart (Span (Interval x _)) = x
getStart (DurationFrom x _)    = x
getStart (DurationTo d x)      = removeDuration d x

getEnd :: TimeSetting -> UTCTime
getEnd (Instant x)           = x
getEnd (Span (Interval _ x)) = x
getEnd (DurationFrom x d)    = addDuration d x
getEnd (DurationTo _ x)      = x

getDurationFrom :: TimeSetting -> Maybe CalendarDiffTime
getDurationFrom (DurationFrom _ x) = Just x
getDurationFrom _ = Nothing

getDurationTo :: TimeSetting -> Maybe CalendarDiffTime
getDurationTo (DurationTo x _ ) = Just x
getDurationTo _ = Nothing

instance FromJSVal TimeSetting where
  fromJSVal = doFromJSVal "TimeSetting" $ \x -> do
    MaybeT (fromJSVal x) >>= \case
      [start, end] -> do
        s <- MaybeT $ fromJSVal start
        e <- MaybeT $ fromJSVal end
        pure $ if s == e then Instant s else Span $ Interval s e
      [start, end, dur1, dur2] -> do
        both (lift . ghcjsPure . isDefined) (dur1,dur2) >>= \case
          (True,False) -> do
            s <- MaybeT $ fromJSVal start
            d <- MaybeT $ fromJSVal dur1
            ddd <- hoistMaybe $ parseISO d
            pure $ DurationFrom s ddd
          (False,True) -> do
            e <- MaybeT $ fromJSVal end
            d <- MaybeT $ fromJSVal dur2
            ddd <- hoistMaybe $ parseISO d
            pure $ DurationTo ddd e
          _ -> do
            s <- MaybeT $ fromJSVal start
            e <- MaybeT $ fromJSVal end
            pure $ if s == e then Instant s else Span $ Interval s e
      _ -> mzero

instance ToJSVal TimeSetting where
  toJSVal x = toJSVal $ case x of
    t@(DurationFrom _ d) -> do
      start <- new (jsg @JSString "Date") . showISO $ getStart t
      end   <- new (jsg @JSString "Date") . showISO $ getEnd t
      dur   <- toJSVal $ showISO d
      pure [start, end, dur, jsUndefined]
    t@(DurationTo d _) -> do
      start <- new (jsg @JSString "Date") . showISO $ getStart t
      end   <- new (jsg @JSString "Date") . showISO $ getEnd t
      dur   <- toJSVal $ showISO d
      pure [start, end, jsUndefined, dur]
    t -> do
      start <- new (jsg @JSString "Date") . showISO $ getStart t
      end   <- new (jsg @JSString "Date") . showISO $ getEnd t
      pure [start, end, jsUndefined, jsUndefined]
      
instance ToJSVal AppState where
  toJSVal (AppState m (Degrees r) l t loc) = do
    o <- obj
    o <# ("moodi" :: JSString) $ toJSVal m
    whenJust loc $
      (o <# ("sijainti" :: JSString)) . (\(Location x) -> x)
    o <# ("rotaatio" :: JSString) $ show @Text r
    o <# ("tasot" :: JSString) $ show @Text <$> l
    o <# ("aika" :: JSString) $ t
    toJSVal o

instance FromJSVal AppState where
  fromJSVal = doFromJSVal "AppState" $
    lift5 AppState <$> propFromJSVal "moodi"
                   <*> fmap Degrees . propFromJSVal "rotaatio"
                   <*> (fmap . fmap) Layer . propFromJSVal "tasot"
                   <*> propFromJSVal "aika"
                   <*> (fmap . fmap) Location . propFromJSVal "sijainti"