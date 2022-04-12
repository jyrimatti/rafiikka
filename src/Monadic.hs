{-# LANGUAGE LambdaCase #-}
module Monadic where

import Universum hiding (unlessM, whenM, unless, when)
import Data.Generics.Labels ()
import Data.Time.Calendar.MonthDay ()
import Data.Time.Calendar.OrdinalDate ()
import Language.Javascript.JSaddle (JSM, JSVal, GHCJSPure, ghcjsPure, isUndefined, ghcjsPureMap, liftJSM, js0, (!), MonadJSM, MakeObject)
import FFI (deserializationFailure)
import GHCJS.Foreign (isFunction)

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