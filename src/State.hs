{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE DerivingVia #-}
{-# LANGUAGE TypeApplications #-}
module State where

import Universum
import Data.Maybe (fromJust)
import Data.Generics.Labels ()
import Data.Time ( UTCTime, CalendarDiffTime, getCurrentTime )
import Time (showISO, parseISO, Interval (Interval), removeDuration, addDuration, roundToPreviousHour)
import Language.Javascript.JSaddle (new, jsg, ToJSVal (toJSVal), JSString, FromJSVal (fromJSVal), ghcjsPure, (!), (<#), obj, jsUndefined, isUndefined)
import Data.Time.Lens ( hours, FlexibleDateTime(flexDT) )
import Control.Lens ((-~))
import JSDOM.Types (JSM)
import Browser (withDebug)
import FFI (deserializationFailure)

newtype Layer = Layer Text
  deriving (Show, Eq)
newtype Degrees = Degrees Double
  deriving (Show, Eq)
newtype Location = Location Text
  deriving (Show)
data Mode = Map | Diagram
  deriving (Show, Eq)

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

defaultMode :: Mode
defaultMode = Map

defaultRotation :: Degrees
defaultRotation = Degrees 0

defaultLayers :: [Layer]
defaultLayers = []

defaultTimeSetting :: IO TimeSetting
defaultTimeSetting = DurationFrom <$> (roundToPreviousHour . (flexDT.hours -~ 1) <$> getCurrentTime)
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
  fromJSVal jsval = do
    aa <- fromJSVal jsval
    case aa of
      Just [start, end] -> do
        s <- fromJSVal start
        e <- fromJSVal end
        case (s,e) of
            (Just ss, Just ee) | ss == ee -> pure $ Just $ Instant ss
            (Just ss, Just ee)            -> pure $ Just $ Span $ Interval ss ee
            _ -> deserializationFailure jsval "TimeSetting"
      Just [start, end, dur1, dur2] -> do
        dur1undef <- ghcjsPure $ isUndefined dur1
        dur2undef <- ghcjsPure $ isUndefined dur2
        if not dur1undef then do
          s <- fromJSVal start
          d <- fromJSVal dur1
          case (s,d) of
            (Just ss, Just dd) -> do
              let ddd = parseISO dd
              case ddd of
                Just dddd -> pure $ Just $ DurationFrom ss dddd
                _ -> deserializationFailure jsval "TimeSetting"
            _ -> deserializationFailure jsval "TimeSetting"
        else if not dur2undef then do
          e <- fromJSVal end
          d <- fromJSVal dur2
          case (e,d) of
            (Just ee, Just dd) -> do
              let ddd = parseISO dd
              case ddd of
                Just dddd -> pure $ Just $ DurationTo dddd ee
                _ -> deserializationFailure jsval "TimeSetting"
            _ -> deserializationFailure jsval "TimeSetting"
        else do
          s <- fromJSVal start
          e <- fromJSVal end
          case (s,e) of
            (Just ss, Just ee) | ss == ee -> pure $ Just $ Instant ss
            (Just ss, Just ee)            -> pure $ Just $ Span $ Interval ss ee
            _ -> deserializationFailure jsval "TimeSetting"
      _ -> deserializationFailure jsval "TimeSetting"

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
    o <# ("moodi" :: JSString) $ case m of Map -> "map" :: Text; Diagram -> "diagram"
    whenJust loc $
      (o <# ("sijainti" :: JSString)) . (\(Location x) -> x)
    o <# ("rotaatio" :: JSString) $ show @Text r
    o <# ("tasot" :: JSString) $ show @Text <$> l
    o <# ("aika" :: JSString) $ t
    toJSVal o

instance FromJSVal AppState where
  fromJSVal o = do
    moodi    <- fromJSVal =<< o ! ("moodi" :: JSString)
    rotaatio <- fromJSVal =<< o ! ("rotaatio" :: JSString)
    tasot    <- fromJSVal =<< o ! ("tasot" :: JSString)
    aika     <- fromJSVal =<< o ! ("aika" :: JSString)
    sijainti <- fromJSVal =<< o ! ("sijainti" :: JSString)
    case (moodi,rotaatio,tasot,aika,sijainti) of
      (Just m,Just r,Just t,Just a,s) -> pure $ Just $ AppState (case m :: Text of "map" -> Map; _ -> Diagram) (Degrees r) (Layer <$> t) a (Location <$> s)
      _ -> deserializationFailure o "AppState"