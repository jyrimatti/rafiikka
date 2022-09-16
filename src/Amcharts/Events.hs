{-# LANGUAGE TypeApplications, ScopedTypeVariables #-}
{-# LANGUAGE GeneralizedNewtypeDeriving #-}
{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE QuantifiedConstraints #-}
{-# LANGUAGE AllowAmbiguousTypes #-}
{-# LANGUAGE DuplicateRecordFields #-}
{-# LANGUAGE DataKinds #-}
{-# LANGUAGE UndecidableInstances #-}
{-# LANGUAGE RankNTypes #-}
{-# LANGUAGE DerivingVia #-}
module Amcharts.Events where

import Universum ( ($), Generic, Int, Text, (.), (<$>), void, (^.), Semigroup ((<>)), Applicative (pure, (<*>)), MaybeT (MaybeT), MonadTrans (lift), (=<<), Maybe (Just), (<=<), Functor (fmap), liftA3 )
import Language.Javascript.JSaddle (JSVal, JSM, JSString, jsg3, FromJSVal, ToJSVal, (!), MakeObject, js1, (#))
import FFI (function1, function2, functionPure1, warn, functionPure2)
import Amcharts.Amcharts ( AmchartsObject, HasEvent )
import GHC.Records (HasField (getField))
import GetSet (getVal, typeBaseName, TypeBaseName, Constant)
import Monadic (readProperty, doFromJSVal, propFromJSVal)
import Browser.Browser (withDebug)
import Language.Javascript.JSaddle.Classes (FromJSVal(fromJSVal))



newtype Done = Done {
  target :: Target
} deriving Generic
  deriving TypeBaseName via Constant "done"
instance FromJSVal Done where
  fromJSVal = doFromJSVal "Target" $
    fmap Done <$> propFromJSVal "target"

data Started = Started
  deriving Generic
instance FromJSVal Started

data Ended = Ended
  deriving Generic
instance FromJSVal Ended

newtype Target = Target JSVal
  deriving (Generic,MakeObject)
instance FromJSVal Target where
  fromJSVal = pure . pure . Target

instance HasField "data" Target (JSM JSVal) where
  getField = getVal "data"

newtype ParseEnded a = ParseEnded {
  target :: Target
} deriving Generic
  deriving TypeBaseName via Constant "parseended"
instance FromJSVal a => FromJSVal (ParseEnded a) where
  fromJSVal = doFromJSVal "ParseEnded" $
    fmap ParseEnded <$> propFromJSVal "target"

data Error = Error {
  code :: Int,
  message :: Text,
  target :: JSVal
} deriving (Generic)
instance FromJSVal Error where
  fromJSVal = doFromJSVal "Error" $
    liftA3 Error <$> propFromJSVal @Int "code"
                 <*> propFromJSVal @Text "message"
                 <*> lift . readProperty "target"

newtype EventDispatcher = EventDispatcher { unEventDispatcher :: JSVal }
  deriving (Generic, ToJSVal, MakeObject)
instance FromJSVal EventDispatcher where
  fromJSVal = pure . pure . EventDispatcher


dispatch :: forall ev obj. (AmchartsObject obj, TypeBaseName ev, HasEvent obj ev ~ ()) => obj -> JSVal -> JSM ()
dispatch obj dat = do
  _ <- obj # ("dispatch" :: Text) $ (typeBaseName @ev, dat)
  pure ()


events :: AmchartsObject obj => obj -> JSM EventDispatcher
events obj = EventDispatcher <$> readProperty "events" obj

cbPure1 :: (MakeObject obj, FromJSVal a, ToJSVal ret) => JSString -> obj -> Text -> (a -> ret) -> JSM ()
cbPure1 name obj event f = void $ obj # name $ (event, functionPure1 f)

cbPure2 :: (MakeObject obj, FromJSVal a1, FromJSVal a2, ToJSVal ret) => JSString -> obj -> Text -> (a1 -> a2 -> ret) -> JSM ()
cbPure2 name obj event f = void $ obj # name $ (event, functionPure2 f)

cb1 :: (MakeObject obj, FromJSVal a, ToJSVal ret) => JSString -> obj -> Text -> (a -> JSM ret) -> JSM ()
cb1 name obj event f = void $ obj # name $ (event, function1 f)

cb2 :: (MakeObject obj, FromJSVal a1, FromJSVal a2, ToJSVal ret) => JSString -> obj -> Text -> (a1 -> a2 -> JSM ret) -> JSM ()
cb2 name obj event f = void $ obj # name $ (event, function2 f)

on1 :: forall ev obj ret. (FromJSVal ev, ToJSVal ret, TypeBaseName ev, AmchartsObject obj, HasEvent obj ev ~ ()) => obj -> (ev -> JSM ret) -> JSM ()
on1 obj x = do
    e <- events obj
    cb1 "on" e (typeBaseName @ev) $ \ev -> withDebug ("On: " <> typeBaseName @ev) $
      x ev

once1 :: forall ev obj ret. (FromJSVal ev, ToJSVal ret, TypeBaseName ev, AmchartsObject obj, HasEvent obj ev ~ ()) => obj -> (ev -> JSM ret) -> JSM ()
once1 obj x = do
    e <- events obj
    cb1 "once" e (typeBaseName @ev) $ \ev -> withDebug ("Once: " <> typeBaseName @ev) $
      x ev
