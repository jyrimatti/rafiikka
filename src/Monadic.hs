{-# LANGUAGE LambdaCase, OverloadedStrings #-}
{-# OPTIONS_GHC -Wno-orphans #-}
{-# LANGUAGE TypeApplications #-}
{-# LANGUAGE FlexibleInstances #-}
{-# LANGUAGE UndecidableInstances #-}
module Monadic where

import Universum hiding (unlessM, whenM, unless, when)
import Data.Time.Calendar.MonthDay ()
import Data.Time.Calendar.OrdinalDate ()
import Language.Javascript.JSaddle (JSM, JSVal, GHCJSPure, ghcjsPure, isUndefined, ghcjsPureMap, liftJSM, js0, (!), MonadJSM, MakeObject, ToJSVal (toJSVal), JSString, (#), jsg, SomeJSArray (SomeJSArray), FromJSVal (fromJSVal))
import FFI (deserializationFailure, warn_, warn)
import GHCJS.Foreign (isFunction, isTruthy)
import qualified Data.List.NonEmpty as NonEmpty
import JavaScript.Array (toListIO)
import Data.Text (pack)

class PropReader a where
  readProp :: Text -> JSVal -> MaybeT JSM a

instance {-# OVERLAPPABLE #-} FromJSVal a => PropReader a where
  readProp = propFromJSVal_

instance FromJSVal a => PropReader (Maybe a) where
  readProp = lift ... tryPropFromJSVal_

propFromJSVal :: PropReader a => Text -> JSVal -> MaybeT JSM a
propFromJSVal = readProp

propFromJSVal_ :: FromJSVal a => Text -> JSVal -> MaybeT JSM a
propFromJSVal_ property = MaybeT . (fromJSVal <=< readProperty property)

tryPropFromJSVal_ :: FromJSVal a => Text -> JSVal -> JSM (Maybe a)
tryPropFromJSVal_ property jsval = do
  mval <- tryReadProperty_ property jsval
  case mval of
    Nothing  -> pure Nothing
    Just val -> fromJSVal val

readProperty :: (MakeObject this, ToJSVal this) => Text -> this -> JSM JSVal
readProperty fieldname this = do
  jval <- this ! fieldname
  isUndef <- ghcjsPure $ isUndefined jval
  if isUndef
    then do
      _ <- warn_ ("Error reading '" <> fieldname <> "' from ", this)
      error $ "Error reading " <> fieldname
    else pure jval

tryReadProperty_ :: MakeObject this => Text -> this -> JSM (Maybe JSVal)
tryReadProperty_ fieldname this = do
  jval <- this ! fieldname
  isUndef <- ghcjsPure $ isUndefined jval
  if isUndef
    then pure Nothing
    else pure (Just jval)

isArray :: JSVal -> JSM Bool
isArray = ghcjsPure . isTruthy <=< jsg @JSString "Array" # ("isArray" :: JSString)

tryArray :: FromJSVal a => Text -> JSVal -> JSM (Maybe [a])
tryArray resultType jsval = do
  isArr <- isArray jsval
  if isArr
    then do
      fromJSValListOf_ jsval
    else do
      deserializationFailure jsval resultType

tryValue :: ToString t => t -> Maybe a -> (a -> JSM ()) -> JSM ()
tryValue description Nothing f = do
  _ <- warn $ pack $ toString description
  pure ()
tryValue _ (Just x) f = f x

fromJSValListOf_ :: FromJSVal a => JSVal -> JSM (Maybe [a])
fromJSValListOf_ x = do
  aa <- toListIO $ SomeJSArray x
  bb <- mapM (doFromJSVal "NonEmpty-element" $ MaybeT . fromJSVal) aa
  let cc = catMaybes bb
  if length cc == length aa
    then pure $ Just cc
    else pure Nothing

instance FromJSVal a => FromJSVal (NonEmpty a) where
  fromJSVal = doFromJSVal "NonEmpty" $ \x -> do
    arr <- MaybeT $ tryArray "NonEmpty" x
    hoistMaybe $ NonEmpty.nonEmpty arr

instance ToJSVal a => ToJSVal (NonEmpty a) where
  toJSVal = toJSVal . toList
  
whenM :: (Monad m, MonadPlus (m2 m), MonadTrans m2) => m Bool -> m2 m a -> m2 m a
whenM mp m = lift mp >>= bool mzero m

unlessM :: (Monad m, MonadPlus (m2 m), MonadTrans m2) => m Bool -> m2 m a -> m2 m a
unlessM mp m = lift mp >>= bool m mzero

whenP :: (MonadTrans m, MonadPlus (m JSM)) => GHCJSPure Bool -> m JSM a -> m JSM a
whenP mp m = lift (ghcjsPure mp) >>= bool mzero m

unlessP :: (MonadTrans m, MonadPlus (m JSM)) => GHCJSPure Bool -> m JSM a -> m JSM a
unlessP mp m = lift (ghcjsPure mp) >>= bool m mzero

guardP :: (MonadTrans m, MonadPlus (m JSM)) => GHCJSPure Bool -> m JSM ()
guardP f = lift (ghcjsPure f) >>= guard

doFromJSVal :: Text -> (JSVal -> MaybeT JSM a) -> JSVal -> JSM (Maybe a)
doFromJSVal msg f jsval = runMaybeT (f jsval) >>= \case
  Nothing -> deserializationFailure jsval msg
  x       -> pure x

isDefined :: JSVal -> GHCJSPure Bool
isDefined = ghcjsPureMap not . isUndefined

invoke :: (MonadJSM (m JSM), MakeObject s, MonadTrans m, MonadPlus (m JSM)) => s -> Text -> m JSM JSVal
invoke obj name = do
  a <- liftJSM $ obj ! name
  guardP $ isFunction a
  liftJSM $ obj ^. js0 name