{-# LANGUAGE CPP #-}
{-# OPTIONS_GHC -Wno-redundant-constraints #-}
module FFI(
  registerGlobalFunctionPure,
  registerGlobalFunctionPure1,
  registerGlobalFunctionPure2,
  registerGlobalFunctionPure3,
  registerGlobalFunction,
  registerGlobalFunction1,
  registerGlobalFunction2,
  registerGlobalFunction3
) where

import Language.Javascript.JSaddle (ToJSVal(..), FromJSVal(..), JSM)
import Data.Text (Text)

#ifdef ghcjs_HOST_OS
import Language.Javascript.JSaddle (JSString, ToJSString(..), JSVal, MonadJSM, liftJSM)
import GHCJS.Foreign.Callback (Callback, syncCallback', syncCallback1', syncCallback2', syncCallback3')
#endif

registerGlobalFunctionPure  :: (                                       ToJSVal r) => Text                 -> r  -> IO ()
registerGlobalFunctionPure1 :: (FromJSVal a,                           ToJSVal r) => Text -> (a           -> r) -> IO ()
registerGlobalFunctionPure2 :: (FromJSVal a, FromJSVal b,              ToJSVal r) => Text -> (a -> b      -> r) -> IO ()
registerGlobalFunctionPure3 :: (FromJSVal a, FromJSVal b, FromJSVal c, ToJSVal r) => Text -> (a -> b -> c -> r) -> IO ()

registerGlobalFunction  :: (                                       ToJSVal r) => Text                 -> JSM r  -> IO ()
registerGlobalFunction1 :: (FromJSVal a,                           ToJSVal r) => Text -> (a           -> JSM r) -> IO ()
registerGlobalFunction2 :: (FromJSVal a, FromJSVal b,              ToJSVal r) => Text -> (a -> b      -> JSM r) -> IO ()
registerGlobalFunction3 :: (FromJSVal a, FromJSVal b, FromJSVal c, ToJSVal r) => Text -> (a -> b -> c -> JSM r) -> IO ()

#ifndef ghcjs_HOST_OS
registerGlobalFunctionPure  _ _ = return ()
registerGlobalFunctionPure1 _ _ = return ()
registerGlobalFunctionPure2 _ _ = return ()
registerGlobalFunctionPure3 _ _ = return ()
registerGlobalFunction  _ _ = return ()
registerGlobalFunction1 _ _ = return ()
registerGlobalFunction2 _ _ = return ()
registerGlobalFunction3 _ _ = return ()
#else
foreign import javascript unsafe "window[$1] = $2"
  js_registerGlobalFunction :: JSString -> Callback a -> IO ()

wrapJSPure :: (MonadJSM m, ToJSVal r) => r -> m JSVal
wrapJSPure = liftJSM . toJSVal

wrapJSPure1 :: (MonadJSM m, FromJSVal a, ToJSVal r) => (a -> r) -> (JSVal -> m JSVal)
wrapJSPure1 f x = liftJSM $ do
  Just v <- fromJSVal x
  toJSVal $ f v

wrapJSPure2 :: (MonadJSM m, FromJSVal a, FromJSVal b, ToJSVal r) => (a -> b -> r) -> (JSVal -> JSVal -> m JSVal)
wrapJSPure2 f x1 x2 = liftJSM $ do
  Just v1 <- fromJSVal x1
  Just v2 <- fromJSVal x2
  toJSVal $ f v1 v2

wrapJSPure3 :: (MonadJSM m, FromJSVal a, FromJSVal b, FromJSVal c, ToJSVal r) => (a -> b -> c -> r) -> (JSVal -> JSVal -> JSVal -> m JSVal)
wrapJSPure3 f x1 x2 x3 = liftJSM $ do
  Just v1 <- fromJSVal x1
  Just v2 <- fromJSVal x2
  Just v3 <- fromJSVal x3
  toJSVal $ f v1 v2 v3

wrapJS :: (MonadJSM m, ToJSVal r) => r -> m JSVal
wrapJS = liftJSM . toJSVal

wrapJS1 :: (MonadJSM m, FromJSVal a, ToJSVal r) => (a -> JSM r) -> (JSVal -> m JSVal)
wrapJS1 f x = liftJSM $ do
  Just v <- fromJSVal x
  toJSVal $ f v

wrapJS2 :: (MonadJSM m, FromJSVal a, FromJSVal b, ToJSVal r) => (a -> b -> JSM r) -> (JSVal -> JSVal -> m JSVal)
wrapJS2 f x1 x2 = liftJSM $ do
  Just v1 <- fromJSVal x1
  Just v2 <- fromJSVal x2
  toJSVal $ f v1 v2

wrapJS3 :: (MonadJSM m, FromJSVal a, FromJSVal b, FromJSVal c, ToJSVal r) => (a -> b -> c -> JSM r) -> (JSVal -> JSVal -> JSVal -> m JSVal)
wrapJS3 f x1 x2 x3 = liftJSM $ do
  Just v1 <- fromJSVal x1
  Just v2 <- fromJSVal x2
  Just v3 <- fromJSVal x3
  toJSVal $ f v1 v2 v3

registerGlobalFunctionPure name f = do
  cb <- syncCallback' (wrapJSPure f)
  js_registerGlobalFunction (toJSString name) cb

registerGlobalFunctionPure1 name f = do
  cb <- syncCallback1' (wrapJSPure1 f)
  js_registerGlobalFunction (toJSString name) cb

registerGlobalFunctionPure2 name f = do
  cb <- syncCallback2' (wrapJSPure2 f)
  js_registerGlobalFunction (toJSString name) cb

registerGlobalFunctionPure3 name f = do
  cb <- syncCallback3' (wrapJSPure3 f)
  js_registerGlobalFunction (toJSString name) cb

registerGlobalFunction name f = do
  cb <- syncCallback' (wrapJS f)
  js_registerGlobalFunction (toJSString name) cb

registerGlobalFunction1 name f = do
  cb <- syncCallback1' (wrapJS1 f)
  js_registerGlobalFunction (toJSString name) cb

registerGlobalFunction2 name f = do
  cb <- syncCallback2' (wrapJS2 f)
  js_registerGlobalFunction (toJSString name) cb

registerGlobalFunction3 name f = do
  cb <- syncCallback3' (wrapJS3 f)
  js_registerGlobalFunction (toJSString name) cb
#endif