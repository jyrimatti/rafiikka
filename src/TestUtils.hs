{-# LANGUAGE LambdaCase, CPP #-}
{-# OPTIONS_GHC -Wno-deprecations #-}

module TestUtils where

#ifndef ghcjs_HOST_OS

import Text.URI (render)
import Language.Javascript.JSaddle (JSContextRef (JSContextRef), Command (..), Result (..), JSStringReceived (JSStringReceived), runJSM, JSM)
import Universum
import Time ( startOfTime )
import Data.Set (singleton)

runTest :: JSM b -> IO b
runTest x = ctx >>= runJSM x

ctx :: IO JSContextRef
ctx = do
    tvar <- newTVarIO 1
    mvar1 <- newMVar $ singleton "a"
    mvar2 <- newMVar [\_ -> pure ()]
    mvar3 <- newMVar $ singleton 1
    pure $ JSContextRef
                1
                startOfTime
                (pure <$> \case
                    DeRefVal _ -> DeRefValResult undefined ""
                    ValueToBool _ -> ValueToBoolResult True
                    ValueToNumber _ -> ValueToNumberResult 1.1
                    ValueToString _ -> ValueToStringResult (JSStringReceived "") 
                    ValueToJSON _ -> ValueToJSONResult (JSStringReceived "")
                    ValueToJSONValue _ -> ValueToJSONValueResult undefined
                    IsNull _        -> IsNullResult True
                    IsUndefined _ -> IsUndefinedResult True
                    StrictEqual _ _ -> StrictEqualResult True
                    InstanceOf _ _ -> InstanceOfResult True
                    PropertyNames _ -> PropertyNamesResult [JSStringReceived ""]
                    Sync -> SyncResult
                )
                (\_ -> pure ())
                (\_ _ -> pure ())
                tvar
                (\_ -> pure ())
                mvar1
                mvar2
                mvar3

#endif