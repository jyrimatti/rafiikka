{-# LANGUAGE TypeApplications, ScopedTypeVariables #-}
{-# LANGUAGE GeneralizedNewtypeDeriving #-}
{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE QuantifiedConstraints #-}
{-# LANGUAGE AllowAmbiguousTypes #-}
{-# LANGUAGE DuplicateRecordFields #-}
{-# OPTIONS_GHC -Wno-redundant-constraints #-}
{-# LANGUAGE DataKinds #-}
{-# LANGUAGE UndecidableInstances #-}
{-# LANGUAGE RankNTypes #-}
module Amcharts.Events where

import Universum ( ($), Generic, Int, Text, (.), (<$>), void )
import Language.Javascript.JSaddle (JSVal, JSM, JSString, jsg3, FromJSVal, ToJSVal, (!), MakeObject)
import FFI (function1, function2, functionPure1)
import Amcharts.Amcharts ( AmchartsObject, HasEvent )
import GHC.Records (HasField (getField))
import GetSet (getVal, typeBaseName, TypeBaseName)



data Done
data Started
data Ended

newtype Target a = Target JSVal deriving (Generic,MakeObject)
instance FromJSVal a => FromJSVal (Target a)

instance (FromJSVal a) => HasField "data" (Target a) (JSM a) where
  getField = getVal "data"

newtype ParseEnded a = ParseEnded {
  target :: Target a
} deriving Generic
instance FromJSVal a => FromJSVal (ParseEnded a)

data Error = Error {
  code :: Int,
  message :: Text,
  target :: JSVal
} deriving (Generic)
instance FromJSVal Error

newtype EventDispatcher = EventDispatcher { unEventDispatcher :: JSVal }
  deriving (Generic, ToJSVal)
instance FromJSVal EventDispatcher



events :: AmchartsObject obj => obj -> JSM EventDispatcher
events obj = EventDispatcher <$> obj ! ("events" :: JSString)

cb :: (ToJSVal obj, ToJSVal b) => JSString -> obj -> Text -> JSM b -> JSM ()
cb name obj event ret = void $ jsg3 @JSString name obj event (function1 $ \(_::JSVal) -> ret)

cb1 :: (ToJSVal obj, FromJSVal a, ToJSVal b) => JSString -> obj -> Text -> (a -> JSM b) -> JSM ()
cb1 name obj event = void . jsg3 @JSString name obj event . function1

cb2 :: (ToJSVal obj, FromJSVal a1, FromJSVal a2, ToJSVal b) => JSString -> obj -> Text -> (a1 -> a2 -> JSM b) -> JSM ()
cb2 name obj event = void . jsg3 @JSString name obj event . function2

cbPure :: (ToJSVal obj, FromJSVal a, ToJSVal b) => JSString -> obj -> Text -> (a -> b) -> JSM ()
cbPure name obj event = void . jsg3 @JSString name obj event . functionPure1

on :: forall ev obj. (TypeBaseName ev, AmchartsObject obj, HasEvent obj ev ~ ()) => obj -> JSM () -> JSM ()
on obj x = do
    e <- events obj
    cb "on" e (typeBaseName @ev) x

on1 :: forall ev obj. (FromJSVal ev, TypeBaseName ev, AmchartsObject obj, HasEvent obj ev ~ ()) => obj -> (ev -> JSM ()) -> JSM ()
on1 obj x = do
    e <- events obj
    cb1 "on" e (typeBaseName @ev) x
on2 :: (FromJSVal a1, FromJSVal a2) => EventDispatcher -> Text -> (a1 -> a2 -> JSM ()) -> JSM ()
on2 = cb2 "on"

once :: EventDispatcher -> Text -> JSM () -> JSM ()
once = cb "once"

once1 :: (FromJSVal a) => EventDispatcher -> Text -> (a -> JSM ()) -> JSM ()
once1 = cb1 "once"

once2 :: (FromJSVal a1, FromJSVal a2) => EventDispatcher -> Text -> (a1 -> a2 -> JSM ()) -> JSM ()
once2 = cb2 "once"
