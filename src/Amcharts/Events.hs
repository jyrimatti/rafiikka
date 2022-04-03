{-# LANGUAGE TypeApplications, ScopedTypeVariables #-}
module Amcharts.Events where

import Universum hiding (on)
import Language.Javascript.JSaddle (JSVal, JSM, JSString, jsg3, FromJSVal, ToJSVal)
import FFI (function1, function2)

cb :: ToJSVal obj => JSString -> obj -> Text -> JSM () -> JSM ()
cb name obj event ret = void $ jsg3 @JSString name obj event (function1 $ \(_::JSVal) -> ret)

cb1 :: (ToJSVal obj, FromJSVal a) => JSString -> obj -> Text -> (a -> JSM ()) -> JSM ()
cb1 name obj event = void . jsg3 @JSString name obj event . function1

cb2 :: (ToJSVal obj, FromJSVal a1, FromJSVal a2) => JSString -> obj -> Text -> (a1 -> a2 -> JSM ()) -> JSM ()
cb2 name obj event = void . jsg3 @JSString name obj event . function2

on :: ToJSVal obj => obj -> Text -> JSM () -> JSM ()
on = cb "on"

on1 :: (ToJSVal obj, FromJSVal a) => obj -> Text -> (a -> JSM ()) -> JSM ()
on1 = cb1 "on"

on2 :: (ToJSVal obj, FromJSVal a1, FromJSVal a2) => obj -> Text -> (a1 -> a2 -> JSM ()) -> JSM ()
on2 = cb2 "on"

once :: ToJSVal obj => obj -> Text -> JSM () -> JSM ()
once = cb "once"

once1 :: (ToJSVal obj, FromJSVal a) => obj -> Text -> (a -> JSM ()) -> JSM ()
once1 = cb1 "once"

once2 :: (ToJSVal obj, FromJSVal a1, FromJSVal a2) => obj -> Text -> (a1 -> a2 -> JSM ()) -> JSM ()
once2 = cb2 "once"

add :: ToJSVal obj => obj -> Text -> JSM () -> JSM ()
add = cb "add"

add1 :: (ToJSVal obj, FromJSVal a) => obj -> Text -> (a -> JSM ()) -> JSM ()
add1 = cb1 "add"

add2 :: (ToJSVal obj, FromJSVal a1, FromJSVal a2) => obj -> Text -> (a1 -> a2 -> JSM ()) -> JSM ()
add2 = cb2 "add"
