{-# LANGUAGE LambdaCase #-}
{-# OPTIONS_GHC -Wno-orphans #-}
{-# LANGUAGE TypeApplications #-}
module Monadic where

import Universum hiding (unlessM, whenM, unless, when)
import Data.Time.Calendar.MonthDay ()
import Data.Time.Calendar.OrdinalDate ()
import Language.Javascript.JSaddle (JSM, JSVal, GHCJSPure, ghcjsPure, isUndefined, ghcjsPureMap, liftJSM, js0, (!), MonadJSM, MakeObject, FromJSVal (fromJSValListOf), ToJSVal, JSString, (#), jsg, ToJSString (toJSString), syncPoint, FromJSString (fromJSString))
import FFI (deserializationFailure, warn)
import GHCJS.Foreign (isFunction, isTruthy)
import Language.Javascript.JSaddle.Classes (FromJSVal(fromJSVal))
import qualified Data.List.NonEmpty as NonEmpty
import JSDOM.Types (ToJSVal(toJSVal))
import Data.Text (pack)

propFromJSVal :: FromJSVal a => Text -> JSVal -> MaybeT JSM a
propFromJSVal property = MaybeT . (fromJSVal <=< tryReadProperty property)

tryPropFromJSVal :: FromJSVal a => Text -> JSVal -> JSM (Maybe a)
tryPropFromJSVal property jsval = do
  mval <- tryReadProperty_ property jsval
  case mval of
    Nothing  -> pure Nothing
    Just val -> fromJSVal val

tryReadProperty :: (MakeObject this, ToJSVal this) => Text -> this -> JSM JSVal
tryReadProperty fieldname this = do
  jval <- this ! fieldname
  isUndef <- ghcjsPure $ isUndefined jval
  if isUndef
    then do
      _ <- warn ("Error reading '" <> fieldname <> "' from ", this)
      
      error $ "Error reading " <> fieldname
    else pure jval

tryReadProperty_ :: (MakeObject this, ToJSVal this) => Text -> this -> JSM (Maybe JSVal)
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
      then fromJSValListOf jsval
      else deserializationFailure jsval resultType
      
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
doFromJSVal msg f jsval = runMaybeT (unlessP (isUndefined jsval) (f jsval)) >>= \case
  Nothing -> deserializationFailure jsval msg
  x       -> pure x

isDefined :: JSVal -> GHCJSPure Bool
isDefined = ghcjsPureMap not . isUndefined

invoke :: (MonadJSM (m JSM), MakeObject s, MonadTrans m, MonadPlus (m JSM)) => s -> Text -> m JSM JSVal
invoke obj name = do
  a <- liftJSM $ obj ! name
  guardP $ isFunction a
  liftJSM $ obj ^. js0 name