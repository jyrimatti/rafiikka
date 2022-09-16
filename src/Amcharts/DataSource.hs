{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE TypeApplications #-}
{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE RankNTypes #-}
{-# LANGUAGE GeneralizedNewtypeDeriving #-}
{-# LANGUAGE DataKinds #-}
{-# LANGUAGE NamedFieldPuns #-}
{-# LANGUAGE DuplicateRecordFields #-}
{-# LANGUAGE FlexibleContexts #-}
{-# LANGUAGE PartialTypeSignatures #-}
{-# LANGUAGE KindSignatures #-}
{-# LANGUAGE FlexibleInstances #-}
{-# OPTIONS_GHC -Wno-orphans #-}
module Amcharts.DataSource where

import Universum (Generic,Int,Text,Show,NonEmpty,Maybe(..), (<$>), ($), MaybeT (MaybeT), hoistMaybe, readMaybe, Applicative ((<*>), pure, liftA2), whenM, (.), show, Semigroup ((<>)), Num ((+)), when, Eq ((==)), Enum (succ), Functor (fmap), Alternative ((<|>)), not, flip, MonadTrans (lift), (=<<))
import Language.Javascript.JSaddle (JSM, JSString, FromJSVal (fromJSVal), JSVal (JSVal), ToJSVal (toJSVal), MakeObject, jsg1, MakeArgs, ghcjsPure, (!), (#))
import JSDOM (currentWindow)
import JSDOM.Generated.Element (removeAttribute)
import Amcharts.Events ( on1, Done, ParseEnded (..), Started, Ended, Error (Error), message, Target (Target))
import Data.Text (replace, unpack)
import Jeti.Types (JetiType)
import Ruma.Types (RumaType)
import Infra.Types (InfraType)
import Trex.Types (TrexType)
import Monadic (doFromJSVal, readProperty, propFromJSVal)
import Types (FintrafficSystem)
import qualified Data.List.NonEmpty as NonEmpty
import Data.List (head)
import Data.Time (Day)
import Data.Aeson (ToJSON)
import Browser.Browser (isSeed, Progress (Progress), withDebug)
import Amcharts.Amcharts (AmchartsObject, HasEvent, Am4Core, am4core)
import Amcharts.Adapter (adapter, add1)
import GHC.Records (HasField (getField))
import GetSet (setJson, getObj, getVal, new, get, setVal)
import Control.Lens.Action ((^!))
import Text.URI (URI)
import FFI (debug, warn)
import GHCJS.Foreign ( jsTypeOf )
import URI (APIResponse (APIResponse))

newtype DataSource = DataSource JSVal
  deriving (Generic, ToJSVal, MakeObject, MakeArgs, AmchartsObject)
instance FromJSVal DataSource where
  fromJSVal = pure . pure . DataSource

type instance HasEvent DataSource Done = ()
type instance HasEvent DataSource (ParseEnded a) = ()
type instance HasEvent DataSource Started = ()
type instance HasEvent DataSource Ended = ()
type instance HasEvent DataSource Error = ()

instance HasField "DataSource" Am4Core (JSM DataSource) where
  getField = getObj DataSource "DataSource"

mkDataSource :: JSM DataSource
mkDataSource = do
  a <- am4core
  a ^! get @"DataSource" . new DataSource ()

load :: DataSource -> JSM ()
load ds = do
  _ <- ds # ("load" :: Text) $ ()
  pure ()

data ReqHeader = ReqHeader {
  key   :: Text,
  value :: Text
} deriving (Generic)

instance ToJSON ReqHeader
instance FromJSVal ReqHeader where
  fromJSVal = doFromJSVal "ReqHeader" $
    liftA2 ReqHeader <$> propFromJSVal "key"
                     <*> propFromJSVal "value"


newtype RequestOptions = RequestOptions JSVal deriving MakeObject

instance HasField "url" DataSource (JSM URI) where
  getField = getVal "url"

instance HasField "data" DataSource (JSM JSVal) where
  getField = getVal "data"

instance HasField "requestOptions" DataSource (JSM RequestOptions) where
  getField = getObj RequestOptions "requestOptions"

instance HasField "requestHeaders" RequestOptions (JSM [ReqHeader]) where
  getField = getVal "requestHeaders"

data DataType = InfraData InfraType
              | JetiData JetiType
              | RumaData RumaType
              | TrexData TrexType
              | Search FintrafficSystem Int
              | Timetable Day
              | Statistics Text
              | Revisions
              | Other Text
  deriving Show

instance FromJSVal DataType where
  fromJSVal = doFromJSVal "DataType" $ \x -> do
    a :: NonEmpty Text <- MaybeT $ fromJSVal x
    let b = head $ NonEmpty.drop 1 a
    let c = head $ NonEmpty.drop 2 a
    case NonEmpty.head a of
      "Infra"      -> InfraData <$> hoistMaybe (readMaybe $ unpack b)
      "Jeti"       -> JetiData <$> hoistMaybe (readMaybe $ unpack b)
      "Ruma"       -> RumaData <$> hoistMaybe (readMaybe $ unpack b)
      "Trex"       -> TrexData <$> hoistMaybe (readMaybe $ unpack b)
      "Search"     -> Search <$> hoistMaybe (readMaybe $ unpack b) <*> hoistMaybe (readMaybe $ unpack c)
      "Timetable"  -> Timetable <$> hoistMaybe (readMaybe $ unpack b)
      "Statistics" -> pure $ Statistics b
      "Revisions"  -> pure Revisions
      aa           -> pure $ Other aa

monitor :: DataSource -> DataType -> JSM ()
monitor ds dataType = do
  on1 ds $ \Error{message} -> do
    _ <- jsg1 @JSString "log" message
    pure ()
  
  on1 @Started ds $ progressStart dataType
  on1 @Ended ds $ progressEnd dataType

  pure ()

luoDatasource :: forall result eventData. (Show result, FromJSVal result, ToJSVal eventData) => DataType -> JSM (APIResponse result) -> (result -> eventData) -> JSM DataSource
luoDatasource dataType urlF converter = do
  ds <- mkDataSource
  whenM (not <$> isSeed) $ do
    (APIResponse u) <- urlF
    ds ^! setVal @"url" u
    ad <- adapter ds
    add1 ad "url" $ \(_::JSVal) -> urlF
  initDS ds
  monitor ds dataType
  on1 ds $ \(ParseEnded target@(Target tar) :: ParseEnded (Maybe result)) -> do
    datJSVal <- readProperty "data" tar
    dat <- flip (doFromJSVal $ show dataType) datJSVal $ \x -> do
      datType <- lift $ ghcjsPure $ jsTypeOf x
      MaybeT $ fromJSVal x
    case dat of
      Just dd -> do
        v <- toJSVal $ converter dd
        ds ^! setVal @"data" v
      Nothing -> do
        _ <- warn @Text "No data!"
        pure ()
  pure ds

initDS :: DataSource -> JSM ()
initDS ds = ds ^! get @"requestOptions" . setJson @"requestHeaders" [ReqHeader "Digitraffic-User" "Rafiikka"]

progressStart :: DataType -> Started -> JSM ()
progressStart dataType _ = withDebug ("progressStart: " <> show dataType)  $ do
    Just window <- currentWindow
    progress <- window ^! get @"progress"
    progress ^! setVal @"title" (Just $ " " <> show dataType)
    maxVal <- progress ^! get @"max"
    progress ^! setVal @"max" (maxVal + 1)
    hasValue <- progress ^! get @"value"
    case hasValue of
      Nothing -> progress ^! setVal @"value" (Just 1)
      Just _ -> pure ()
    pure ()

progressEnd :: DataType -> Ended -> JSM ()
progressEnd dataType _ = withDebug ("progressEnd: " <> show dataType)  $ do
  Just window <- currentWindow
  progress <- window ^! get @"progress"
  title <- progress ^! get @"title"
  case title of
    Just t -> progress ^! setVal @"title" (Just $ replace (" " <> show dataType) "" t)
    _ -> pure ()

  val <- progress ^! get @"value"
  progress ^! setVal @"value" (fmap succ val <|> Just 1)

  maxVal <- progress ^! get @"max"
  when (val == Just maxVal) $ do
    let (Progress elem) = progress
    elem `removeAttribute` ("value" :: JSString)
    progress ^! setVal @"max" 1
