{-# LANGUAGE CPP, ScopedTypeVariables #-}
{-# OPTIONS_GHC -Wno-redundant-constraints -Wno-incomplete-uni-patterns #-}
{-# LANGUAGE TypeApplications #-}

module FFI(
  registerGlobalFunctionPure,
  registerGlobalFunctionPure1,
  registerGlobalFunctionPure2,
  registerGlobalFunctionPure3,
  registerGlobalFunction,
  registerGlobalFunction1,
  registerGlobalFunction2,
  registerGlobalFunction3,
  functionPure1,
  functionPure2,
  functionPure3,
  function1,
  function2,
  function3,
  procedure,
  procedure1,
  procedure2,
  procedure3
) where


#ifndef ghcjs_HOST_OS
import Language.Javascript.JSaddle (ToJSVal(..), FromJSVal(..), JSM, fun, function, Function (Function), call, eval, global, (<#), JSCallAsFunction, valToObject, MakeObject, JSString)
import Data.Data (typeOf)
import Universum
#else
import Language.Javascript.JSaddle (ToJSVal(..), FromJSVal(..), JSM, JSString, ToJSString(..), JSVal, MonadJSM, liftJSM, Object (Object))
import GHCJS.Foreign.Callback (Callback, syncCallback', syncCallback1', syncCallback2', syncCallback3', asyncCallback, asyncCallback1, asyncCallback2, asyncCallback3)
import Control.Applicative (liftA2, liftA3)
import Data.Data (typeOf)
import Universum
#endif

registerGlobalFunctionPure  :: (                                       ToJSVal r) => Text                 ->     r  -> JSM ()
registerGlobalFunctionPure1 :: (FromJSVal a,                           ToJSVal r) => Text -> (a           ->     r) -> JSM ()
registerGlobalFunctionPure2 :: (FromJSVal a, FromJSVal b,              ToJSVal r) => Text -> (a -> b      ->     r) -> JSM ()
registerGlobalFunctionPure3 :: (FromJSVal a, FromJSVal b, FromJSVal c, ToJSVal r) => Text -> (a -> b -> c ->     r) -> JSM ()

registerGlobalFunction      :: (                                       ToJSVal r) => Text                 -> JSM r  -> JSM ()
registerGlobalFunction1     :: (FromJSVal a,                           ToJSVal r) => Text -> (a           -> JSM r) -> JSM ()
registerGlobalFunction2     :: (FromJSVal a, FromJSVal b,              ToJSVal r) => Text -> (a -> b      -> JSM r) -> JSM ()
registerGlobalFunction3     :: (FromJSVal a, FromJSVal b, FromJSVal c, ToJSVal r) => Text -> (a -> b -> c -> JSM r) -> JSM ()



-- Procedures don't return a value, and can thus be executed asynchronously
-- TODO: asyncFunction does not seem to work for non-GHCJS, so have to separate non-GHCJS to use a synchronous approach for now...
#ifndef ghcjs_HOST_OS
procedure  :: JSM () -> JSM Function
procedure1 :: (FromJSVal a1) => (a1 -> JSM ()) -> JSM Function
procedure2 :: (FromJSVal a1, FromJSVal a2) => (a1 -> a2 -> JSM ()) -> JSM Function
procedure3 :: (FromJSVal a1, FromJSVal a2, FromJSVal a3) => (a1 -> a2 -> a3 -> JSM ()) -> JSM Function

procedure f = function $ fun $ \_ _ _ -> do
  f

procedure1 f = function $ fun $ \_ _ [a1] -> do
  v1 <- fromJSVal a1
  case v1 of
    Nothing -> putTextLn $ "Error deserializing a " <> show (typeOf a1) <> " from JSVal"
    Just x1 -> f x1

procedure2 f = function $ fun $ \_ _ [a1, a2] -> do
  v1 <- fromJSVal a1
  v2 <- fromJSVal a2
  case v1 of
    Nothing -> putTextLn $ "Error deserializing a " <> show (typeOf a1) <>" from JSVal"
    Just x1 -> case v2 of
      Nothing -> putTextLn $ "Error deserializing a " <> show (typeOf a2) <>" from JSVal"
      Just x2  -> f x1 x2

procedure3 f = function $ fun $ \_ _ [a1, a2, a3] -> do
  v1 <- fromJSVal a1
  v2 <- fromJSVal a2
  v3 <- fromJSVal a3
  case v1 of
    Nothing -> putTextLn $ "Error deserializing a " <> show (typeOf a1) <>" from JSVal"
    Just x1 -> case v2 of
      Nothing -> putTextLn $ "Error deserializing a " <> show (typeOf a2) <>" from JSVal"
      Just x2  -> case v3 of
        Nothing -> putTextLn $ "Error deserializing a " <> show (typeOf a3) <>" from JSVal"
        Just x3  -> f x1 x2 x3
#else
foreign import javascript unsafe "$r = $1"
  makeProcedureWithCallback  :: Callback (IO ()) -> IO Object

foreign import javascript unsafe "$r = $1"
  makeProcedureWithCallback1 :: Callback (JSVal -> IO ()) -> IO Object

foreign import javascript unsafe "$r = $1"
  makeProcedureWithCallback2 :: Callback (JSVal -> JSVal -> IO ()) -> IO Object

foreign import javascript unsafe "$r = $1"
  makeProcedureWithCallback3 :: Callback (JSVal -> JSVal -> JSVal -> IO ()) -> IO Object

wrapJS_ :: (MonadJSM m) => JSM () -> m ()
wrapJS_ = liftJSM

wrapJS1_ :: (MonadJSM m, FromJSVal a1) => (a1 -> JSM ()) -> (JSVal -> m ())
wrapJS1_ f a1 = liftJSM $ do
  v1 <- fromJSVal a1
  case v1 of
    Nothing -> putStrLn $ "Error deserializing a " <> show (typeOf a1) <>" from JSVal"
    Just x1 -> f x1

wrapJS2_ :: (MonadJSM m, FromJSVal a1, FromJSVal a2) => (a1 -> a2 -> JSM ()) -> (JSVal -> JSVal -> m ())
wrapJS2_ f a1 a2 = liftJSM $ do
  v1 <- fromJSVal a1
  v2 <- fromJSVal a2
  case v1 of
    Nothing -> putStrLn $ "Error deserializing a " <> show (typeOf a1) <>" from JSVal"
    Just x1 -> case v2 of
      Nothing -> putStrLn $ "Error deserializing a " <> show (typeOf a2) <>" from JSVal"
      Just x2 -> f x1 x2

wrapJS3_ :: (MonadJSM m, FromJSVal a1, FromJSVal a2, FromJSVal a3) => (a1 -> a2 -> a3 -> JSM ()) -> (JSVal -> JSVal -> JSVal -> m ())
wrapJS3_ f a1 a2 a3 = liftJSM $ do
  v1 <- fromJSVal a1
  v2 <- fromJSVal a2
  v3 <- fromJSVal a3
  case v1 of
    Nothing -> putStrLn $ "Error deserializing a " <> show (typeOf a1) <>" from JSVal"
    Just x1 -> case v2 of
      Nothing -> putStrLn $ "Error deserializing a " <> show (typeOf a2) <>" from JSVal"
      Just x2 -> case v3 of
        Nothing -> putStrLn $ "Error deserializing a " <> show (typeOf a3) <>" from JSVal"
        Just x3 -> f x1 x2 x3

procedure  :: JSM () -> JSM Object
procedure1 :: (FromJSVal a1) => (a1 -> JSM ()) -> JSM Object
procedure2 :: (FromJSVal a1, FromJSVal a2) => (a1 -> a2 -> JSM ()) -> JSM Object
procedure3 :: (FromJSVal a1, FromJSVal a2, FromJSVal a3) => (a1 -> a2 -> a3 -> JSM ()) -> JSM Object

procedure  f = makeProcedureWithCallback  =<< asyncCallback  (wrapJS_ f)
procedure1 f = makeProcedureWithCallback1 =<< asyncCallback1 (wrapJS1_ f)
procedure2 f = makeProcedureWithCallback2 =<< asyncCallback2 (wrapJS2_ f)
procedure3 f = makeProcedureWithCallback3 =<< asyncCallback3 (wrapJS3_ f)
#endif

#ifndef ghcjs_HOST_OS
doCall :: (MakeObject f, ToJSVal a) => f -> a -> JSM ()
doCall f a = do
  _ <- call f global [a]
  pure ()

cbPure1 :: (FromJSVal a1, ToJSVal ret) => (a1 -> ret) -> JSCallAsFunction
cbPure1 f = fun $ \ _ _ [a1, returnValueF] -> do
  v1 <- fromJSVal a1
  case v1 of
    Nothing -> putTextLn $ "Error deserializing a " <> show (typeOf a1) <>" from JSVal"
    Just x1 -> doCall returnValueF $ f x1

cbPure2 :: (FromJSVal a1, FromJSVal a2, ToJSVal ret) => (a1 -> a2 -> ret) -> JSCallAsFunction
cbPure2 f = fun $ \ _ _ [a1, a2, returnValueF] -> do
  v1 <- fromJSVal a1
  v2 <- fromJSVal a2
  case v1 of
    Nothing -> putTextLn $ "Error deserializing a " <> show (typeOf a1) <>" from JSVal"
    Just x1 -> case v2 of
      Nothing -> putTextLn $ "Error deserializing a " <> show (typeOf a2) <>" from JSVal"
      Just x2 -> doCall returnValueF $ f x1 x2

cbPure3 :: (FromJSVal a1, FromJSVal a2, FromJSVal a3, ToJSVal ret) => (a1 -> a2 -> a3 -> ret) -> JSCallAsFunction
cbPure3 f = fun $ \ _ _ [a1, a2, a3, returnValueF] -> do
  v1 <- fromJSVal a1
  v2 <- fromJSVal a2
  v3 <- fromJSVal a3
  case v1 of
    Nothing -> putTextLn $ "Error deserializing a " <> show (typeOf a1) <>" from JSVal"
    Just x1 -> case v2 of
      Nothing -> putTextLn $ "Error deserializing a " <> show (typeOf a2) <>" from JSVal"
      Just x2 -> case v3 of
        Nothing -> putTextLn $ "Error deserializing a " <> show (typeOf a3) <>" from JSVal"
        Just x3 -> doCall returnValueF $ f x1 x2 x3

cb1 :: (FromJSVal a1, ToJSVal ret) => (a1 -> JSM ret) -> JSCallAsFunction
cb1 f = fun $ \ _ _ [a1, returnValueF] -> do
  v1 <- fromJSVal a1
  case v1 of
    Nothing -> putTextLn $ "Error deserializing a " <> show (typeOf a1) <>" from JSVal"
    Just x1 -> doCall returnValueF $ f x1

cb2 :: (FromJSVal a1, FromJSVal a2, ToJSVal ret) => (a1 -> a2 -> JSM ret) -> JSCallAsFunction
cb2 f = fun $ \ _ _ [a1, a2, returnValueF] -> do
  v1 <- fromJSVal a1
  v2 <- fromJSVal a2
  case v1 of
    Nothing -> putTextLn $ "Error deserializing a " <> show (typeOf a1) <>" from JSVal"
    Just x1 -> case v2 of
      Nothing -> putTextLn $ "Error deserializing a " <> show (typeOf a2) <>" from JSVal"
      Just x2 -> doCall returnValueF $ f x1 x2

cb3 :: (FromJSVal a1, FromJSVal a2, FromJSVal a3, ToJSVal ret) => (a1 -> a2 -> a3 -> JSM ret) -> JSCallAsFunction
cb3 f = fun $ \ _ _ [a1, a2, a3, returnValueF] -> do
  v1 <- fromJSVal a1
  v2 <- fromJSVal a2
  v3 <- fromJSVal a3
  case v1 of
    Nothing -> putTextLn $ "Error deserializing a " <> show (typeOf a1) <>" from JSVal"
    Just x1 -> case v2 of
      Nothing -> putTextLn $ "Error deserializing a " <> show (typeOf a2) <>" from JSVal"
      Just x2 -> case v3 of
        Nothing -> putTextLn $ "Error deserializing a " <> show (typeOf a3) <>" from JSVal"
        Just x3 -> doCall returnValueF $ f x1 x2 x3
#endif

#ifndef ghcjs_HOST_OS
registerGlobalFunctionPure name = global <# name

registerGlobalFunctionPure1 name f = do
  _ <- call (eval $ "(function(cb) { window['" <> name <> "'] = function(a1) { var ret = []; cb(a1, function(r) { ret[0] = r; }); return ret[0]; }; })") global [cbPure1 f]
  pure ()

registerGlobalFunctionPure2 name f = do
  _ <- call (eval $ "(function(cb) { window['" <> name <> "'] = function(a1, a2) { var ret = []; cb(a1, a2, function(r) { ret[0] = r; }); return ret[0]; }; })") global [cbPure2 f]
  pure ()

registerGlobalFunctionPure3 name f = do
  _ <- call (eval $ "(function(cb) { window['" <> name <> "'] = function(a1, a2, a3) { var ret = []; cb(a1, a2, a3, function(r) { ret[0] = r; }); return ret[0]; }; })") global [cbPure3 f]
  pure ()

registerGlobalFunction name = global <# name

registerGlobalFunction1 name f = do
  _ <- call (eval $ "(function(cb) { window['" <> name <> "'] = function(a1) { var ret = []; cb(a1, function(r) { ret[0] = r; }); return ret[0]; }; })") global [cb1 f]
  pure ()

registerGlobalFunction2 name f = do
  _ <- call (eval $ "(function(cb) { window['" <> name <> "'] = function(a1, a2) { var ret = []; cb(a1, a2, function(r) { ret[0] = r; }); return ret[0]; }; })") global [cb2 f]
  pure ()

registerGlobalFunction3 name f = do
  _ <- call (eval $ "(function(cb) { window['" <> name <> "'] = function(a1, a2, a3) { var ret = []; cb(a1, a2, a3, function(r) { ret[0] = r; }); return ret[0]; }; })") global [cb3 f]
  pure ()

#else
foreign import javascript unsafe "window[$1] = $2"
  js_registerGlobalFunction :: JSString -> Callback a -> IO ()

foreign import javascript unsafe "window[$1] = $2"
  js_registerGlobalValue :: JSString -> JSVal -> IO ()

wrapJSPure :: (MonadJSM m, ToJSVal ret) => ret -> m JSVal
wrapJSPure = liftJSM . toJSVal

wrapJSPure1 :: (MonadJSM m, FromJSVal a1, ToJSVal ret) => (a1 -> ret) -> (JSVal -> m JSVal)
wrapJSPure1 f x = liftJSM $ toJSVal =<< fmap f <$> fromJSVal x

wrapJSPure2 :: (MonadJSM m, FromJSVal a1, FromJSVal a2, ToJSVal ret) => (a1 -> a2 -> ret) -> (JSVal -> JSVal -> m JSVal)
wrapJSPure2 f x1 x2 = liftJSM $ toJSVal =<< liftA2 f <$> fromJSVal x1 <*> fromJSVal x2

wrapJSPure3 :: (MonadJSM m, FromJSVal a1, FromJSVal a2, FromJSVal a3, ToJSVal ret) => (a1 -> a2 -> a3 -> ret) -> (JSVal -> JSVal -> JSVal -> m JSVal)
wrapJSPure3 f x1 x2 x3 = liftJSM $ toJSVal =<< liftA3 f <$> fromJSVal x1 <*> fromJSVal x2 <*> fromJSVal x3

wrapJS :: (MonadJSM m, ToJSVal ret) => ret -> m JSVal
wrapJS = liftJSM . toJSVal

wrapJS1 :: (MonadJSM m, FromJSVal a1, ToJSVal ret) => (a1 -> JSM ret) -> (JSVal -> m JSVal)
wrapJS1 f x = liftJSM $ toJSVal =<< fmap f <$> fromJSVal x

wrapJS2 :: (MonadJSM m, FromJSVal a1, FromJSVal a2, ToJSVal ret) => (a1 -> a2 -> JSM ret) -> (JSVal -> JSVal -> m JSVal)
wrapJS2 f x1 x2 = liftJSM $ toJSVal =<< liftA2 f <$> fromJSVal x1 <*> fromJSVal x2

wrapJS3 :: (MonadJSM m, FromJSVal a1, FromJSVal a2, FromJSVal a3, ToJSVal ret) => (a1 -> a2 -> a3 -> JSM ret) -> (JSVal -> JSVal -> JSVal -> m JSVal)
wrapJS3 f x1 x2 x3 = liftJSM $ toJSVal =<< liftA3 f <$> fromJSVal x1 <*> fromJSVal x2 <*> fromJSVal x3

registerGlobalFunctionPure  name f = liftJSM $ js_registerGlobalValue    (toJSString name) =<< wrapJSPure f
registerGlobalFunctionPure1 name f = liftJSM $ js_registerGlobalFunction (toJSString name) =<< syncCallback1' (wrapJSPure1 f)
registerGlobalFunctionPure2 name f = liftJSM $ js_registerGlobalFunction (toJSString name) =<< syncCallback2' (wrapJSPure2 f)
registerGlobalFunctionPure3 name f = liftJSM $ js_registerGlobalFunction (toJSString name) =<< syncCallback3' (wrapJSPure3 f)

registerGlobalFunction  name f = liftJSM $ js_registerGlobalFunction (toJSString name) =<< syncCallback'  (wrapJS f)
registerGlobalFunction1 name f = liftJSM $ js_registerGlobalFunction (toJSString name) =<< syncCallback1' (wrapJS1 f)
registerGlobalFunction2 name f = liftJSM $ js_registerGlobalFunction (toJSString name) =<< syncCallback2' (wrapJS2 f)
registerGlobalFunction3 name f = liftJSM $ js_registerGlobalFunction (toJSString name) =<< syncCallback3' (wrapJS3 f)
#endif

#ifndef ghcjs_HOST_OS
functionPure1 :: (FromJSVal a1, ToJSVal ret) => (a1 -> ret) -> JSM Function
functionPure2 :: (FromJSVal a1, FromJSVal a2, ToJSVal ret) => (a1 -> a2 -> ret) -> JSM Function
functionPure3 :: (FromJSVal a1, FromJSVal a2, FromJSVal a3, ToJSVal ret) => (a1 -> a2 -> a3 -> ret) -> JSM Function

functionPure1 f = fmap Function . valToObject =<< call (eval @JSString "(function(cb) { return function(a1) { var ret = []; cb(a1, function(r) { ret[0] = r; }); return ret[0]; }; })") global [cbPure1 f]
functionPure2 f = fmap Function . valToObject =<< call (eval @JSString "(function(cb) { return function(a1, a2) { var ret = []; cb(a1, a2, function(r) { ret[0] = r; }); return ret[0]; }; })") global [cbPure2 f]
functionPure3 f = fmap Function . valToObject =<< call (eval @JSString "(function(cb) { return function(a1, a2, a3) { var ret = []; cb(a1, a2, a3, function(r) { ret[0] = r; }); return ret[0]; }; })") global [cbPure3 f]

function1 :: (FromJSVal a1, ToJSVal ret) => (a1 -> JSM ret) -> JSM Function
function2 :: (FromJSVal a1, FromJSVal a2, ToJSVal ret) => (a1 -> a2 -> JSM ret) -> JSM Function
function3 :: (FromJSVal a1, FromJSVal a2, FromJSVal a3, ToJSVal ret) => (a1 -> a2 -> a3 -> JSM ret) -> JSM Function

function1 f = fmap Function . valToObject =<< call (eval @JSString "(function(cb) { return function(a1) { var ret = []; cb(a1, function(r) { ret[0] = r; }); return ret[0]; }; })") global [cb1 f]
function2 f = fmap Function . valToObject =<< call (eval @JSString "(function(cb) { return function(a1, a2) { var ret = []; cb(a1, a2, function(r) { ret[0] = r; }); return ret[0]; }; })") global [cb2 f]
function3 f = fmap Function . valToObject =<<  call (eval @JSString "(function(cb) { return function(a1, a2, a3) { var ret = []; cb(a1, a2, a3, function(r) { ret[0] = r; }); return ret[0]; }; })") global [cb3 f]
#else
foreign import javascript unsafe "$r = $1"
  makeFunctionWithCallback1 :: Callback (JSVal -> IO JSVal) -> IO Object

foreign import javascript unsafe "$r = $1"
  makeFunctionWithCallback2 :: Callback (JSVal -> JSVal -> IO JSVal) -> IO Object

foreign import javascript unsafe "$r = $1"
  makeFunctionWithCallback3 :: Callback (JSVal -> JSVal -> JSVal -> IO JSVal) -> IO Object

functionPure1 :: (FromJSVal a1, ToJSVal ret) => (a1 -> ret) -> JSM Object
functionPure2 :: (FromJSVal a1, FromJSVal a2, ToJSVal ret) => (a1 -> a2 -> ret) -> JSM Object
functionPure3 :: (FromJSVal a1, FromJSVal a2, FromJSVal a3, ToJSVal ret) => (a1 -> a2 -> a3 -> ret) -> JSM Object

functionPure1 f = makeFunctionWithCallback1 =<< syncCallback1' (wrapJSPure1 f)
functionPure2 f = makeFunctionWithCallback2 =<< syncCallback2' (wrapJSPure2 f)
functionPure3 f = makeFunctionWithCallback3 =<< syncCallback3' (wrapJSPure3 f)

function1 :: (FromJSVal a1, ToJSVal ret) => (a1 -> JSM ret) -> JSM Object
function2 :: (FromJSVal a1, FromJSVal a2, ToJSVal ret) => (a1 -> a2 -> JSM ret) -> JSM Object
function3 :: (FromJSVal a1, FromJSVal a2, FromJSVal a3, ToJSVal ret) => (a1 -> a2 -> a3 -> JSM ret) -> JSM Object

function1 f = makeFunctionWithCallback1 =<< syncCallback1' (wrapJS1 f)
function2 f = makeFunctionWithCallback2 =<< syncCallback2' (wrapJS2 f)
function3 f = makeFunctionWithCallback3 =<< syncCallback3' (wrapJS3 f)
#endif